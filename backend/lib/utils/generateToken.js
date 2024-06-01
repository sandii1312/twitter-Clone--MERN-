import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
    try {
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
          expiresIn: "15d",
        });
      
        res.cookie("jwt", token, {
          maxAge: 15 * 24 * 60 * 60 * 3200,
          httpOnly: true, //prevent from XSS attacks cross-site scripting attacks
          sameSite: "strict", // CSRF attacks cross-site request forgency attacks
          secure: process.env.NODE_ENV !== "development",
        });
        
    } catch (error) {
        console.error("Error at Token generation",error);
        res.status(500).json({error: "Internal server Error"});
    }
};
