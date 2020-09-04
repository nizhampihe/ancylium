function wscon (req)
{
  var ret = false ;
  var header = req.toString ().split ("\r\n") ;
  header.forEach (function (item)
  {
    if (item === "Upgrade: websocket")
      ret = true ;
  }) ;
  return ret ;
}

var wsparse = function (byte)
{
  this.opcode = byte.readUInt8 (0) & 0xF ;
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
    for (var i = 0 ; i < 4  ; i++, offset++) mask [i] = parseInt (byte.toString ("hex").substr (offset * 2, 2), 16) ;
    for (var i = 0 ; i < this.length ; i++) this.message += String.fromCharCode (parseInt (byte.toString ("hex").substr ((i + offset) * 2, 2), 16) ^ mask [i % 4]) ;
  }
  else for (var i = 0 ; i < this.length ; i++) this.message += String.fromCharCode (parseInt (byte.toString ("hex").substr ((i + offset) * 2, 2), 16)) ;
}

function wsfram (mess)
{
  var length = Buffer.byteLength (mess) ;
  var lbyte = length < 126 ? 0 : 2 ;
  var plength = lbyte === 0 ? length : 126 ;
  var buffer = Buffer.alloc (2 + lbyte + length) ;
  buffer.writeUInt8 (0b10000001, 0) ;
  buffer.writeUInt8 (plength, 1) ;
  if (lbyte > 0) buffer.writeUInt16bBE (length, 2) ;
  buffer.write (mess, lbyte > 0 ? 4 : 2) ;
  return buffer ;
}

function wskey (req)
{
  var ret = false ;
  var header = req.toString ().split ("\r\n") ;
  header.forEach (function (item)
  {
    item = item.split (": ") ;
    if (item [0] === "Sec-WebSocket-Key") ret = item [1] ;
  }) ;
  return ret ;
}

function hmethod (data, met)
{
  return data.toString ().split ("\r\n") [0].split (" ") [0] === met ;
}

function httpv (data)
{
  return data.toString ().split ("\r\n") [0].split (" ") [2] ;
}

var sockets = [] ;

require ("net").createServer (function (socket)
{
  sockets.push (socket) ;
  //console.log (socket.remoteAddress + " : " + socket.remotePort + " connection") ;
  //console.log ("connected " + sockets.length) ;

  socket.on ("end", function ()
  {
    sockets.splice (sockets.indexOf (socket), 1) ;
    //console.log (socket.remoteAddress + " : " + socket.remotePort + " disconnect") ;
    //console.log ("connected " + sockets.length) ;
  }) ;
  socket.on ("data", function (data)
  {
    if (hmethod (data, "GET"))
    {
      if (wscon (data))
      {
        var key = require ("crypto").createHash ("sha1").update (wskey (data) + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", "binary").digest ("base64") ;
        console.log (wskey (data)) ;
        console.log (key) ;
        socket.write (httpv (data) + 
          " 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          "Sec-WebSocket-Accept: " + key + "\r\n\r\n", function ()
        {
          socket.wstat = true ;
        }) ;
      }
      else
      {
        if (data
          .toString ()
          .split ("\r\n") [0]
          .split (" ") [1] === "/")
        {
          socket.write (httpv (data) +
            " 200 OK\r\n" +
            "Content-Type : text/html\r\n\r\n",
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
          socket.write (httpv (data) + " 404 Not Found\r\n\r\n", function ()
          {
            socket.end () ;
          }) ;
        }
      }
    }
    else if (socket.wstat)
    {
      var parsed = new wsparse (data) ;
      if (parsed.opcode == 8)
      {
        socket.wstat = undefined ;
        socket.end () ;
      }
      else
      {
        sockets.forEach (function (socketi)
        {
          if (socketi.wstat) socketi.write (wsfram (parsed.message)) ;
        }) ;
      }
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

/*.on ("connection", function (socket)
{
  sockets.push (socket) ;
  console.log (socket.remoteAddress + " : " + socket.remotePort + " connection") ;
}) ;*/