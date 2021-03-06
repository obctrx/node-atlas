/*------------------------------------*\
	GLOBAL FUNCTIONS
\*------------------------------------*/
/* jslint node: true */

/**
 * Read a JSON file and return a literal Object else kill process.
 * @private
 * @function openConfiguration
 * @memberOf NA#
 * @this NA
 * @param {string} configName File name (on file path + name in relative). Base folder is the folder where is `webconfig.json`.
 * @return {Object} Literal object of JSON file.
 */
exports.openConfiguration = function (configName) {
	var NA = this,
		path = NA.modules.path,
		data = {},
		pathfile = path.join(NA.serverPath, configName);

	try {

		/* If file is a correct JSON file, return a literal Object file's content. */
		delete require.cache[pathfile];
		return require(pathfile);
	} catch (exception) {
		if (exception.toString().indexOf("SyntaxError") !== -1) {

			/* If the file is a JSON file, but contain a Syntax error. */
			data.syntaxError = exception.toString();
			data.fileName = configName;
			NA.log(NA.cliLabels.webconfigSyntaxError.replace(/%([\-a-zA-Z0-9_]+)%/g, function (regex, matches) { return data[matches]; }));
		} else {

			/* Other errors. */
			NA.log(exception);
		}

		/* In case of error, kill current process. */
		process.kill(process.pid);
	}
};

/**
 * Allow you to write from CLI.
 * @private
 * @function log
 * @memberOf NA#
 * @this NA
 * @param {...string} str All sentence you want display in server-side console.
 */
exports.log = function () {
	var logs = console.log,
		args = arguments,
		color = "\u001b[36m";

	if (/[\u001b]/.test(arguments[0])) {
		args = Array.prototype.slice.call(arguments, 1);
		color = arguments[0];
	}

	for (var log in args) {
		if (args.hasOwnProperty(log)) {
			logs(color + args[log] + '\u001B[0m');
		}
	}
};

/**
 * Open a controller file.
 * @private
 * @function loadController
 * @memberOf NA#
 * @this NA
 * @param {string} controller The name of controller file we want to load.
 */
exports.openController = function (controller) {
	var NA = this,
		path = NA.modules.path,
		commonControllerPath = path.join(
			NA.serverPath,
			NA.webconfig.controllersRelativePath,
			(controller) ? controller : ''
		);

	/* If a controller is required. Loading of this controller... */
	if (typeof controller !== 'undefined') {

		/* Open controller and load it */
		try {
			NA.controllers[controller] = require(commonControllerPath);
		/* In case of error. */
		} catch (err) {
			if (err && err.code === 'MODULE_NOT_FOUND') {
				err.controller = commonControllerPath;
				return NA.log(NA.cliLabels.notFound.controller.replace(/%([\-a-zA-Z0-9_]+)%/g, function (regex, matches) { return err[matches]; }));
			} else if (err) {
				return NA.log(err);
			}
		}
	}
};

/**
 * Intercept DOM from common file.
 * @private
 * @function explainError
 * @memberOf NA~
 * @param {NA}                NA            NodeAtlas instance.
 * @param {Object}            err           Error to explain.
 * @param {string}            variationName Name of JSON file.
 * @param {string}            languageCode  Current language for this variation.
 * @param {boolean|undefined} errorDisabled Force no error message.
 */
function explainError(NA, err, variationsPath, languageCode, errorDisabled) {
	err.variationsPath = variationsPath;
	if (err.code === 'ENOENT' && !errorDisabled && !languageCode) {
		NA.log(NA.cliLabels.variationNotFound.replace(/%([\-a-zA-Z0-9_]+)%/g, function (regex, matches) { return err[matches]; }));
	} else if (err.toString().indexOf('SyntaxError') !== -1) {
		err.syntaxError = err.toString();
		NA.log(NA.cliLabels.variationSyntaxError.replace(/%([\-a-zA-Z0-9_]+)%/g, function (regex, matches) { return err[matches]; }));
	} else if (err.code !== 'ENOENT') {
		NA.log(err);
	}
	return false;
}

/**
 * Open a variation file.
 * @private
 * @function openVariation
 * @memberOf NA#
 * @this NA
 * @param {string}            variationName Name of JSON file.
 * @param {string}            languageCode  Current language for this variation.
 * @param {boolean|undefined} errorDisabled Force no error message.
 * @returns {Object|boolean}  Return all data from JSON or false if an error occured.
 */
exports.openVariation = function (variationName, languageCode, errorDisabled) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		variationsPath;

		/* Find the correct path for variations. */
		variationsPath = path.join(
			NA.serverPath,
			NA.webconfig.variationsRelativePath,
			(languageCode) ? languageCode : '',
			(variationName) ? variationName : ''
		);

	/* Explain errors. */
	if (typeof variationName !== 'undefined') {
		try {
			/* Return the variations variable into an object. */
			return JSON.parse(fs.readFileSync(variationsPath, 'utf-8'));
		} catch (err) {
			/* Explain errors. */
			explainError(NA, err, variationsPath, languageCode, errorDisabled);
		}
	} else {
		return {};
	}
};

/**
 * Open a temlpate file.
 * @private
 * @function openView
 * @memberOf NA#
 * @this NA
 * @param {Object}            routeParameters Parameters set into `routes[<currentRoute>]`.
 * @param {Object}            viewsPath       Path to template file.
 * @param {openView~callback} callback        Next steps after opening file.
 */
exports.openView = function (routeParameters, viewsPath, callback) {
	var NA = this,
		fs = NA.modules.fs;

	fs.readFile(viewsPath, 'utf-8', function (err, data) {
		if (NA.webconfig.view) {
			data = data.replace("#{routeParameters.view}", routeParameters.view);
		}
		if (err) {
			err.viewsPath = viewsPath;
			if (typeof routeParameters.view === 'undefined') {
				NA.log(NA.cliLabels.viewNotSet);
			} else {
				NA.log(NA.cliLabels.viewNotFound.replace(/%([\-a-zA-Z0-9_]+)%/g, function (regex, matches) { return err[matches]; }));
			}
		} else {

			/**
			 * Next steps after opening file.
			 * @callback openView~callback
			 * @param {string} data All HTML data from template.
			 */
			callback(data);
		}
   });
};

/**
 * Clone Object A into B and the purpose is : change A not affect B.
 * @public
 * @function clone
 * @memberOf NA#
 * @param {Object} object The A object.
 * @return {Object} Return the B object.
 */
exports.clone = function (object) {
	var NA = this,
		copy,
		result;

	/* Handle the 3 simple types, and null or undefined */
	if (null === object || undefined === object || "object" !== typeof object) {
		result = object;
	}

	/* Handle Date */
	if (object instanceof Date) {
		copy = new Date();
		copy.setTime(object.getTime());
		result = copy;
	}

	/* Handle Array */
	if (object instanceof Array) {
		result = object.slice(0);
	}

	/* Handle Object */
	if (object instanceof Object) {
		copy = {};
		NA.forEach(object, function (attr) {
			copy[attr] = NA.clone(object[attr]);
		});
		result = copy;
	}

	return result;
};

/**
 * A safe iterator for object properties.
 * @public
 * @function forEach
 * @memberOf NA#
 * @param {Object|Array}     object   The Object or Array to iterate.
 * @param {forEach~callback} callback Provide in first argument the current object, provide in second all objects.
 */
exports.forEach = function (object, callback) {
	if (object instanceof Array) {
		for (var i = 0; i < object.length; i++) {
			callback(object[i], object);
		}
	} else {
		for (var current in object) {
			if (object.hasOwnProperty(current)) {

				/**
				 * Run this for each object.
				 * @callback forEach~callback
				 */
				callback(current, object);
			}
		}
	}
};

/**
 * Know if a file exist.
 * @private
 * @function ifFileExist
 * @memberOf NA#
 * @param {string}               physicalPath Absolute OS path to a filename.
 * @param {string}               [fileName]   Name of file if not set in end of `physicalPath`.
 * @param {ifFileExist~callback} callback     If file exist provide arguments `callback(null, true)` else `callback(err)`
 *                                            with `err` containing `path`, `physicalPath` and `filename` informations.
 */
exports.ifFileExist = function (physicalPath, fileName, callback) {
	var NA = this,
		fs = NA.modules.fs,
		path = NA.modules.path,
		pathToResolve = physicalPath;

	if (typeof fileName === 'string') {
		pathToResolve = path.join(physicalPath, fileName);
	}

	/* This function block the event loop (EL) */
	fs.stat(pathToResolve, function (err) {
		if (err && err.code === 'ENOENT') {
			err.path = pathToResolve;
			err.physicalPath = physicalPath;
			err.fileName = fileName;

			/**
			 * If file do not exist, bad next step...
			 * @callback ifFileExist~callback
			 */
			callback(err, false);
		} else {

			/**
			 * If file exist, good next step !
			 */
			callback(null, true);
		}
	});
};

/**
 * Load into `{locals}.common` to object format the content of common variation file.
 * @public
 * @function common
 * @memberOf NA#
 * @param {string} languageCode Select a subdirectory for load variation (name is generaly the languageCode).
 * @param {object} locals       An object for attach common variation. If empty, a new empty object is created.
 */
exports.common = function (languageCode, locals) {
	var NA = this,
		extend = NA.modules.extend;

	/* Create a global variation object if is not passed. */
	locals = locals || {};

	/* Load variation from languageCode directory or root directory (depend if languageCode is defined)... */
	locals.common = NA.openVariation(NA.webconfig.variation, languageCode);

	/* ...and complete empty value with value of file in root directory. */
	if (languageCode) {
		locals.common = extend(true, NA.openVariation(NA.webconfig.variation, undefined, true), locals.common);
	}

	return locals;
};

/**
 * Load into `{locals}.specific` to object format the content of a specific variation file.
 * @public
 * @function specific
 * @memberOf NA#
 * @param {string} specific     Select the specific variation associate to the current page.
 * @param {string} languageCode Select a subdirectory for load variation (name is generaly the languageCode).
 * @param {object} locals       An object for attach specific variation. If empty, a new empty object is created.
 */
exports.specific = function (specific, languageCode, locals) {
	var NA = this,
		extend = NA.modules.extend;

	/* Create a global variation object if is not passed. */
	locals = locals || {};

	/* Load variation from languageCode directory or root directory (depend if languageCode is defined)... */
	locals.specific = NA.openVariation(specific, languageCode);

	/* ...and complete empty value with value of file in root directory. */
	if (languageCode) {
		locals.specific = extend(true, NA.openVariation(specific, undefined, true), locals.specific);
	}

	return locals;
};

/**
 * Load a HTML fragment and inject variation for an async result.
 * @public
 * @function view
 * @memberOf NA#
 * @param {string} viewFile Path of file used into viewsRelativePath directory.
 * @param {object} locals   Local variables used for transform view + locals into HTML.
 */
exports.view = function (viewFile, locals) {
	var NA = this,
		data,
		ejs = NA.modules.ejs,
		pug = NA.modules.pug,
		fs = NA.modules.fs,
		path = NA.modules.path,
		engine = NA.webconfig.pug ? pug : ejs;

	/* Set the file currently in use. */
	locals.filename = path.join(NA.serverPath, NA.webconfig.viewsRelativePath, viewFile);

	if (typeof locals.pug === "boolean") {
		engine = locals.pug ? pug : ejs;
	}

	try {
		/* Transform ejs/pug data and inject incduded file. */
		data = engine.render(
			fs.readFileSync(path.join(NA.serverPath, NA.webconfig.viewsRelativePath, viewFile), 'utf-8'),
			locals
		);
	} catch (err) {
		/* Make error more readable. */
		data = err.toString()
			.replace(/</g, "&lt;")
			.replace(/[\n]/g, "<br>")
			.replace(/\t/g, "<span style='display:inline-block;width:32px'></span>")
			.replace(/    /g, "<span style='display:inline-block;width:32px'></span>")
			.replace(/   /g, "<span style='display:inline-block;width:32px'></span>")
			.replace(/  /g, "<span style='display:inline-block;width:32px'></span>")
			.replace(/ >> /g, "<span style='display:inline-block;width:32px'>&gt;&gt;</span>")
			.replace(/> ([0-9])+\|/g, "<span style='display:inline-block;margin-left:-13px'>> $1|</span>")
			.replace(/^([a-zA-Z]+):/g, "$1:<br><br>");
	}

	return data;
};

/**
 * Extend an object with next object passed in param.
 * @public
 * @function extend
 * @memberOf NA#
 * @param {...object} objects Each object to extend the first.
 */
exports.extend = function (objects) {
	var NA = this;

	function copyItem(source, prop) {
		if (source[prop].constructor === Object) {
			if (!objects[prop] || objects[prop].constructor === Object) {
				objects[prop] = objects[prop] || {};
				NA.extend(objects[prop], source[prop]);
			} else {
				objects[prop] = source[prop];
			}
		} else {
			objects[prop] = source[prop];
		}
	}

	Array.prototype.slice.call(arguments, 1).forEach(function(source) {
		if (source) {
			NA.forEach(source, function (prop) {
				copyItem(source, prop);
			});
		}
	});

	return objects;
};