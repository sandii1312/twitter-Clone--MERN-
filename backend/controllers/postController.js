import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notification.model.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    const userId = req.user._id.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ error: "User Not found" });

    if (!text && !img) {
      return res.status(400).json({ error: "post must have text or image" });
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    await newPost.save();

    res.status(201).json(newPost);
  } catch (error) {
    console.log("Error in creating post", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return req.status(404).json({ error: "Post not found" });

    if (post.user.toString() !== req.user._id.toString())
      return req
        .status(404)
        .json({ error: "you are not authorized to delete this post" });

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Post deleted Successfully" });
  } catch (error) {
    console.log("Error in deleting post", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    if (!text) return res.status(404).json({ error: "Text is required" });

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post Not Found" });
    }

    const comment = { user: userId, text };

    post.comments.push(comment);

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    console.log("Error in commenting On post", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      //Unlike post
      await User.updateOne({_id: userId},{$pull: {likedPosts: postId}});
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({ error: "Post unliked successfully" });
    } else {
        //Like post
        post.likes.push(userId);
        await User.updateOne({_id: userId},{$push: {likedPosts: postId}});
      await post.save();

      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();
      res.status(200).json({ error: "Post liked successfully" });
    }
  } catch (error) {
    console.log("Error in Like post", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    if (posts.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in Get All post", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLikedPosts = async (req,res) => {
    const userId = req.params.id;

    try {
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({error: "User Not Found"});
        
        const likedPosts = await Post.find({_id:{$in: user.likedPosts}})
        .populate({
            path: "user",
            select: "-password",
          })
          .populate({
            path: "comments.user",
            select: "-password",
          });

          res.status(200).json(likedPosts)

    } catch (error) {
        console.log("Error in Liked posts", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const getFollowingPosts = async (req,res) => {
    const userId = req.user._id;

    try {
      const user = await User.findById(userId);
      if(!user){
        return res.status(404).json({error: "User Not Found"});
      }

      const following = user.following;

      const feedPosts = await Post.find({user: {$in : following}})
      .sort({createdAt: -1})
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

      if(feedPosts.length === 0 ){
        return res.status(200).json({message: "No post In Feed"});
      }

      return res.status(200).json(feedPosts);
        

    } catch (error) {
        console.log("Error in following posts", error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserPosts = async (req,res) => {
  
  try {
    const {userName} = req.params;

    const user = await User.findOne({userName});
    if(!user){
      return res.status(404).json({error: "User not found"});
    }

    const posts = await Post.find({user: user._id}).sort({createdAt: -1})
    .populate({
      path: "user",
      select: "-password",
    })
    .populate({
      path: "comments.user",
      select: "-password",
    });

    if(posts.length === 0){
      res.status(200).json({message: "No post yet Posted"});
    }
    
    res.status(200).json(posts);
  } catch (error) {
      console.log("Error in user posts", error.message);
      res.status(500).json({ error: "Internal server error" });
  }
};


