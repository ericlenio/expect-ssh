var util=require('util');
var clim=require('clim');
clim("",console,true);
require('date-format-lite');
clim.getTime=function() {
  var d=new Date();
  return d.format("MM/DD hh:mm:ss.SS");
};

var EscreenController=require(util.format('%s/EscreenController.js',process.env.ESH_HOME));
var EscreenServer=require(util.format('%s/EscreenServer.js',process.env.ESH_HOME));
var profileDir=process.argv[2];
var port=process.argv[3];
var controller=new EscreenController(profileDir);
var server=new EscreenServer(port,controller);
controller.init();
server.start();