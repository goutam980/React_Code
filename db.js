const mongoose = require("mongoose");


const Schema = mongoose.Schema;
const ObjectId = mongoose.ObjectId;

const User = new Schema({
    email: { type: String, unique: true }, // Make email unique to avoid duplicate entries
    password: String,
    name: String,
});

const UserModel = mongoose.model("users", User);
module.exports = {
    UserModel,
};
