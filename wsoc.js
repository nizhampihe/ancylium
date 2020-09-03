function wscon (req)
{
  var ret = false ;
  var header = req.toString ().split ("\r\n") ;
  header.forEach (function (item)
  {
    if (item === "Connection: Upgrade")
      ret = true
  }) ;
  return ret ;
}

var wsparse = function (byte)
{
  this.opcode = byte.readUInt8 (0) & 0xF ;
  if (opcode == 8) socket.end () ;
  var masked = byte.readUInt8 (1) >>> 7 & 0x1 ;
  this.length = byte.readUInt8 (1) & 0x7F ;
  var offset = 2 ;
  var mask = [] ;
  this.message = "" ;
  if (this.length > 125)
  {
    if (this.length == 126)
    {
      this.length = byte.readUInt16BE (2) ;
      offset += 2 ;
    }
    else
    {
      this.length = 0 ;
      offset += 8 ;
    }
  }
  if (masked)
  {
    for (var i = 0 ; i < 4  ; i++, offset++)
    {
      mask [i] = parseInt (byte.toString ("hex").substr (offset * 2, 2), 16) ;
    }
    for (var i = 0 ; i < this.length ; i++)
    {
      this.message += String.fromCharCode (parseInt (byte.toString ("hex").substr ((i + offset) * 2, 2), 16) ^ mask [i % 4]) ;
    }
  }
  else
  {
    for (var i = 0 ; i < this.length ; i++)
    {
      this.message += String.fromCharCode (parseInt (byte.toString ("hex").substr ((i + offset) * 2, 2), 16)) ;
    }
  }
}

function wskey (req)
{
  var ret = false ;
  var header = req.toString ().split ("\r\n") ;
  header.forEach (function (item)
  {
    item = item.split (": ") ;
    if (item [0] === "Sec-WebSocket-Key")
      ret = item [1] ;
  }) ;
  return ret ;
}

require ("net").createServer (function (socket)
{
  var wstat = false ;
  socket.on ("data", function (data)
  {
    if (data
      .toString ()
      .split ("\r\n") [0]
      .split (" ") [0] === "GET")
    {
      if (wscon (data))
      {
        var key = wskey (data) + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" ;
        key = require ("crypto").createHash ("sha1").update (key, "binary").digest ("base64") ;
        socket.write (data
          .toString ()
          .split ("\r\n") [0]
          .split (" ") [2] + 
          " 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          "Sec-WebSocket-Accept: " + key + "\r\n\r\n", function ()
        {
          wstat = true ;
        }) ;
      }
      else
      {
        if (data
          .toString ()
          .split ("\r\n") [0]
          .split (" ") [1] === "/")
        {
          socket.write (data
            .toString ()
            .split ("\r\n") [0]
            .split (" ") [2]
            + " 200 OK\r\n"
            + "Content-Type : text/html\r\n\r\n",
          function ()
          {
            require ("fs")
            .createReadStream ("home.html", {encoding : "utf8"})
            .on ("data", function (data)
            {
              socket.write (data) ;
            })
            .on ("end", function ()
            {
              socket.end () ;
            }) ;
          }) ;
        }
        else
        {
          socket.write (data
            .toString ()
            .split ("\r\n") [0]
            .split (" ") [2]
            + " 404 Not Found\r\n\r\n",
          function ()
          {
            socket.end () ;
          }) ;
        }
      }
    }
    else if (wstat)
    {
      var parsed = new wsparse (data) ;
      console.log (parsed.message) ;
    }
    else
    {
      socket.end ("HTTP/1.1 500 Internal Server Error\r\n\r\n") ;
    }
  }) ;
}).listen (process.env.PORT || 8080, function ()
{
  console.log ("server on ") ;
}) ;