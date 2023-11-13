import React, {useState} from 'react';
import axios from "axios";

// Add new user to file
async function addUser(username, password) {
    try {
      const res = await axios.post('http://localhost:5000/register', {username: username, password: password});
      // check if new user was added, return eitehr newUser or error
      return res.data;
    } catch (error) {
      // Handle any file read or write errors here
      console.error('Error:', error);
      return null; // Return null or handle the error in your own way
    }
}

// Find user in file
async function findUser(username, password) {
    const res = await axios.post('http://localhost:5000/login', {username: username, password: password});
    console.log("findUser");
    console.log(res.data);
    return res.data;
}

export const Login = (props) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await findUser(username, password);
            if (result && result.username === username) {
                props.setUserID(result.userID);
                props.onFormSwitch('HomePage');
            } else {
                console.error("Wrong username/password. Try again.");
            }
        } catch (error) {
            console.error("An error occurred:", error);
        }
    }

        return(
            <div className="loginsignup-container">
                <form className="form" id="login" onSubmit={handleSubmit}>
                    <h1 className="form__title">Login</h1>
                    <div className="form__message form_message--error"></div>
                    <div className="form__input-group">
                        <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" className="form__input" autoFocus placeholder="Username"></input>
                        <div className="form__input--error-message"></div>
                    </div>
                    <div className="form__input-group">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="form__input" placeholder="Password"></input>
                        <div className="form__input--error-message"></div>
                    </div>
                    <button className="form__button" type="submit">Login</button>
                </form>
                <button className="switch__form" onClick={() => props.onFormSwitch('signup')}>Don't have an account? Sign up here</button>
            </div>
        )
}

export const SignUp = (props) => {

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newUser = await addUser(username, password);
        if (newUser.error) {
            console.error(newUser.error);
        }else {// redirect to home 
            props.onFormSwitch('HomePage')
        }
    }

        return(
            <div className="loginsignup-container">
                <form className="form" id="createAccount" onSubmit={handleSubmit}>
                    <h1 className="form__title">Create Account</h1>
                    <div className="form__message form__message--error"></div>
                    <div className="form__input-group">
                        <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" id="signupUsername" className="form__input" autoFocus placeholder="Username"></input>
                        <div className="form__input-error-message"></div>
                    </div>
                    <div className="form__input-group">
                        <input type="text" className="form__input"  placeholder="Email Address"></input>
                        <div className="form__input-error-message"></div>
                    </div>
                    <div className="form__input-group">
                        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="form__input"  placeholder="Password"></input>
                        <div className="form__input-error-message"></div>
                    </div>
                    <div className="form__input-group">
                        <input value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} type="password" className="form__input"  placeholder="Confirm password"></input>
                        <div className="form__input-error-message"></div>
                    </div>
                    <button className="form__button" type="submit">Create account</button>
                </form>
                                   
                <button className="switch__form" onClick={() => props.onFormSwitch('login')} >Already have an account? Login here</button>
            </div>
        )
    }
