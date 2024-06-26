import User from "../models/user.model.js";
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";

export const signup = async (req, res) => {
    try {
        
        console.log("Received signup request:", req.body);
        
        const {fullName, userName, email, password} = req.body;
        
        if(!fullName || !userName || !email || !password){
            return res.status(400).json({error: " missing values"});
        }
        
        if (!userName.trim()) {
            return res.status(400).json({ error: "Username cannot be empty" });
        }
        
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        if(!emailRegex.test(email)){
            return res.status(400).json({error: "Invalid email format"});
        }
        
        
        const existingUser = await User.findOne({userName});
        if(existingUser){
            return res.status(400).json({error: "UserName is already taken"});
        }
        
        
        const existingEmail = await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({error: "Email is already taken"});
        }
        
        if(password.length < 6){
            return res.status(400).json({error: "password must be greater than 6 character"});
        }
        
        //hash Passsword
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);
        
        const newUser = new User(
            {
                fullName,
                userName,
                email,
                password: hashedPassword
            }
        );

        console.log(newUser);
        
        if(newUser) {
            generateTokenAndSetCookie(newUser._id,res);
            await newUser.save();
            
            return res.status(200).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                userName: newUser.userName,
                email: newUser.email,
                followers: newUser.followers,
                following: newUser.following,
                profileImg: newUser.profileImg,
                coverImg: newUser.coverImg,
            })
        }
        else{
            return res.status(400).json({error: "Invalid User Data"});
        }
        
        
    } catch (error) {
        console.log("Error in signUp controller",error.message); 
        
        return res.status(500).json({error: "Internal server Error"});
    }
};
export const login = async (req, res) => {
    try {

        const {userName,password} = req.body;

        if(!userName || !password){
            return res.status(400).json({error: "username or password field should not be null"});
        }
        
        const user = await User.findOne({userName});
        const isPasswordCorrect  = await bcrypt.compare(password,user?.password || "");
        
        if(!user || isPasswordCorrect){
            return res.status(400).json({error: "Invalid username or password"});
        }

        generateTokenAndSetCookie(user._id,res);

        return res.status(200).json({
            _id: user._id,
            fullName: user.fullName,
            userName: user.userName,
            email: user.email,
            followers: user.followers,
            following: user.following,
            profileImg: user.profileImg,
            coverImg: user.coverImg,
        });


        
    } catch (error) {
        console.log("Error in login controller",error.message); 
        
        return res.status(500).json({error: "Internal server Error"});
    }
};
export const logout = async (req, res) => {
    try {
        res.cookie("jwt","",{maxAge: 0});
        return res.status(200).json({message:"Logged out successfully"});
    } catch (error) {
        console.log("Error in logout controller",error.message); 
        
        return res.status(500).json({error: "Internal server Error"});
    }
}

export const getMe = async (req,res) =>{

    try {
        const user = await User.findById(req.user._id).select("-password");
        return res.status(200).json(user);
    } catch (error) {
        console.log("Error in getMe controller",error.message); 
        
        return res.status(500).json({error: "Internal server Error"});
    }

};