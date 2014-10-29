// evals user code inside of a sandbox.
// SandCastle gives us nice stacktraces when there's an error
// so we can display them to the user.
// unfortunately, I don't know of a way to execute several scripts,
// and maintain the global namespace between them,
// but I'm looking into it. more to come.
var SandCastle = require('sandcastle');

var sandbox_eval = function(obj, cb) {
  var allCode;
  if (typeof obj === Object) {
    var code = obj.code;
    var test = obj.test;
    var testFun = obj.testFun || 'testFunction';
    var sandBox = obj.sandBox || new SandCastle();
    // call the function named testFun inside the object.
    // kind of a cheap hack but whatever
    allCode = [code, test, testFun+"()"].join(";\n");
  } else {
    var sandBox = new SandCastle();
    allCode = obj;
  }
  var script = sandBox.createScript(allCode);
  // cb gets passed (error, output)
  script.on("exit", cb);
  // we can add additional variables.
  script.run();
};