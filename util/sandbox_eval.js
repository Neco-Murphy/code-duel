// evals user code inside of a sandbox.
// SandCastle gives us nice stacktraces when there's an error
// so we can display them to the user.
// unfortunately, I don't know of a way to execute several scripts,
// and maintain the global namespace between them,
// but I'm looking into it. more to come.

var SandCastle = require('sandcastle');