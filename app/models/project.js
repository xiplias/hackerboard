var mongoose = require('mongoose'),
    Schema    = mongoose.Schema;

var ProjectSchema = new Schema({
	created:     {type : Date,  default : Date.now},
	title:       {type: String, default: '', trim : true},
  short:       {type: String, default: '', trim : true},
	content:     {type: String, default: '', trim : true},
  looking_for: {type: Array,  default: []},
  github:      {type: String, default: []},
	user:        {type: Schema.ObjectId, ref : 'User'}
});

ProjectSchema.statics = {
  load: function (id, cb) {
    this.findOne({ _id : id }).populate('user').exec(cb);
  }
};

mongoose.model('Project', ProjectSchema);
