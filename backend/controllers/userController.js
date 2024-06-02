import bcrypt from 'bcryptjs';
import {v2 as cloudinary} from 'cloudinary'

//models
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const getUserProfile = async (req,res) => {
    const {userName} = req.params;

    try {
        const user = await User.findOne({userName}).select("-password");
        if(!user){
            res.status(400).json({error: "user not found"});
        }

        res.status(200).json(user); 
    } catch (error) {
        console.log("Error in getting user profile",error.message);
        res.status(500).json({error: error.message});
    }
}


export const followUnfollowUser = async (req,res) => {

    try {
        const {id} = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        if(id === req.user._id.toString()){
            res.status(404).json({error: " you can't follow yourself"});
        }
        if(!userToModify || !currentUser) {
            res.status(404).json({error: "User can't found"});
        }

        const isFollowing  =  await currentUser.following.includes(id);

        if(isFollowing){
            await User.findByIdAndUpdate(id, { $pull: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, { $pull: {following: id}});
            res.status(200).json({message: "user unfollowed successfully"});
        }
        else{
            await User.findByIdAndUpdate(id, { $push: {followers: req.user._id}});
            await User.findByIdAndUpdate(req.user._id, { $push: {following: id}});

            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });

            await newNotification.save();

            res.status(200).json({message: "user followed successfully"});
        }


    } catch (error) {
        console.log("Error in followUnfollowUser",error.message);
        res.status(500).json({error: error.message});
    }
}

export const getSuggestedUser = async (req,res) => {
    try {
        const userId = req.user._id;
        const usersFollowedByMe = await User.findById(userId).select('following');

        const users = await User.aggregate([
            {
                $match:{
                    _id: {$ne: userId}
                }
            },
            {
                $sample:{size:10}
            }
        ])

        const filteredUsers = users.filter(user=>!usersFollowedByMe.following.includes(user._id));

        const suggestedUsers = filteredUsers.slice(0,4);
        suggestedUsers.forEach((user)=> (user.password= null));

        res.status(200).json(suggestedUsers);

    } catch (error) {
        console.log("Error in Suggestion",error.message);
        res.status(500).json({error: error.message});
    }
}

export const updateUser = async (req,res) => {
    const { fullName,email,userName,currentPassword,newPassword,bio,link} = req.body;
    let {coverImg, profileImg} = req.body;

    const userId = req.user._id;

    try {
        let user = await User.findById(userId);

        if(!user) return res.status(404).json({error: "User not found"});

        if((!currentPassword && newPassword) || (!newPassword && currentPassword)){
            return res.status(404).json({error: "Provide both the cuurent and new password"});
        }
        
        if(currentPassword && newPassword){
            const isMatch = await bcrypt.compare(currentPassword,user.password)
            if(!isMatch) return res.status(404).json({error: "Current password is incorrect"});
            
            if(newPassword.length < 6 ){
                return res.status(404).json({error: "password must be aleast 6 characters long"});
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword,salt);
        }

        if(profileImg){
            if(profileImg){
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0])
            }
            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
        }
        if(coverImg){
            if(coverImg){
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0])
            }
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            profileImg = uploadedResponse.secure_url;
        }

        user.fullName = fullName || user.fullName;
        user.userName = userName || user.userName;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;
        user.link = link || user.link;

        user = await user.save();

        user.password = null;

        return res.status(200).json(user);
        
    } catch (error) {
        console.log("Error in updating user",error.message);
        res.status(500).json({error: error.message});
    }
}

