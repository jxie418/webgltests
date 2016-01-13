/**
 * Created by jamesxieaudaexplorecom on 9/24/15.
 */
var express = require('express');
var app = express();

app.use(express.static(__dirname +'/public'));
/*
app.get('/',function(req,res){
    res.send("Hello word from server.js");
});
*/

app.listen(3008);
console.log("Server running on port 3008.");