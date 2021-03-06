var grunt = require('grunt');
var spawn = require('child_process').spawn;

var gruntCmd = (process.platform === 'win32') ? 'grunt.cmd' : 'grunt';

var makeOptions = function (options) {

  var baseOptions = {
    base: null,
    prefix: 'grunt-',
    verbose: false,
    force: true
  };

  if (options) {
    for (var key in options) {
      baseOptions[key] = options[key];
      if(key != 'base' && key != 'prefix' && key != 'deps'){
        grunt.option(key, options[key]);
      }
    }
  }

  return baseOptions;
};


function findDependencies(task, deps, prefix) {
  if (deps) {
    for (var taskName in deps) {
      if (deps.hasOwnProperty(taskName)) {
        if (prefix+taskName == task) {
          var result = deps[taskName];

          if (Array.isArray(result)) {
            return result;
          } else {
            var arr = [];
            arr.push(result);
            return arr;
          }

        }
      } 
    }
  }

  return null;
}

module.exports = function (gulp, options) {
  var opt = makeOptions(options);
  var tasks = getTasks(opt);

  for (var name in tasks) {
    if (tasks.hasOwnProperty(name)) {
      var fn = tasks[name];
      var dependencies = findDependencies(name, opt.deps, opt.prefix);
      if (dependencies != null) {
        gulp.task(name,dependencies,fn);
      } else {
        gulp.task(name, fn);
      }
    }
  }

};

var getTasks = module.exports.tasks = function (opt) {

  var oldCwd = process.cwd();
  var cwd = opt.base != null ? opt.base : oldCwd;

  grunt.file.setBase(cwd);

  var gruntCliDir = opt.base ? (opt.base + "/") : "";

  grunt.task.init([]);

  process.chdir(oldCwd);

  var gruntTasks = grunt.task._tasks,
    finalTasks = {};

  var registerGruntTask = function (name) {
    finalTasks[opt.prefix + name] = function (cb) {
      if (opt.verbose) {
        console.log('[grunt-gulp] Running Grunt "' + name + '" task...');
      }
      var args = opt.force ?  [name, '--force', '--verbose=' + opt.verbose] : [name, '--verbose=' + opt.verbose];
      for (var key in opt) {
        if (key != 'base' && key != 'prefix') {
          args = args.concat('--' + key + '=' + opt[key]);
        }
      }
      var child = spawn(
        gruntCliDir + gruntCmd,
        args,
        {cwd: cwd}
      );
      child.stdout.on('data', function (d) {
        grunt.log.write(d);
      });
      child.stderr.on('data', function (d) {
        grunt.log.error(d);
      });
      child.on('close', function (code) {
        if (opt.verbose) {
          grunt.log.ok('[grunt-gulp] Done running Grunt "' + name + '" task.');
        }
        if (code != 0) {
           grunt.fail.warn('[grunt-gulp] Failed running Grunt "' + name + '" task.')
        }
        cb();
      });
    };
  }

  for (var name in gruntTasks) {
    if (gruntTasks.hasOwnProperty(name)) {
      // add tasks
      registerGruntTask(name);
      // also add target-specific tasks
      for (var target in grunt.config.get(name)) {
        registerGruntTask(name + ':' + target);
      }
    }
  }

  return finalTasks;
};
