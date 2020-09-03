require ("net")
.createServer (function (socket)
{
  socket.on ("data", function (data)
  {
    console.log (data.toString ()) ;
    if (data
      .toString ()
      .split ("\r\n") [0]
      .split (" ") [1] === "/")
    {
      require ("fs").access ("home.html",
        require ("fs").F_OK, function (err)
      {
        if (err)
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
        else
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
  }) ;
}).listen (process.env.PORT || 8080, function ()
{
  console.log ("server on") ;
}) ;