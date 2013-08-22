/**
 * Module dependencies.
 */
var mongoose = require('mongoose')
  , env = process.env.NODE_ENV || 'development'
  , config = require('../../config/config')[env]
  , Schema = mongoose.Schema;

/**
 * Project Schema
 */

var ProjectSchema = new Schema({
	created: {type : Date, default : Date.now},
	title: {type: String, default: '', trim : true},
  short: {type: String, default: '', trim : true},
	content: {type: String, default: '', trim : true},
  looking_for: {type: Array, default: []},
  github: {type: String, default: []},
	user: {type : Schema.ObjectId, ref : 'User'}
});


/**
 * Statics
 */

ProjectSchema.statics = {
  load: function (id, cb) {
    this.findOne({ _id : id }).populate('user').exec(cb);
  }
};

mongoose.model('Project', ProjectSchema);
