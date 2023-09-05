import { socialLoginRepository } from '@/repository';
import { createToken } from '@/utils/index'
import axios from 'axios';

const socialCode = {
    KAKAO: 1,
    GITHUB: 2,
    GOOGLE: 3
}

const githubOptions = {
    clientID: process.env.GITHUB_ID,
    clientSecret: process.env.GITHUB_SECRET,
}
const googleOptions = {
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
}
const kakaoOptions = {
    clientID: process.env.KAKAO_ID,
    clientSecret: process.env.KAKAO_SECRET,
}

export const socialLoginService = {
    kakaoLoginService: async (code, uri) => {
        try {
            const token = await axios.post('https://kauth.kakao.com/oauth/token', null, {
                params: {
                    code,
                    client_id: kakaoOptions.clientID,
                    client_secret: kakaoOptions.clientSecret,
                    redirect_url: uri,
                    grant_type: 'authorization_code'
                }
            });
            const kakaoUser = await axios.get('https://kapi.kakao.com/v2/user/me', {
                headers: {
                    'Authorization': `Bearer ${token.data.access_token}`
                }
            });
            if (!kakaoUser) {
                return { error: "" }
            }
            const user = await socialLoginRepository.findBySocialId(kakaoUser.data.id);
            if (!user) {
                const newUser = await socialLoginRepository.createSocialUser({
                    email: kakaoUser.data.kakao_account.email || null,
                    code: socialCode.KAKAO,
                    name: kakaoUser.data.kakao_account.profile.nickname,
                    type: "kakao",
                    id: kakaoUser.data.id,
                    image_url: kakaoUser.data.kakao_account.profile.profile_image_url
                });
                const createdToken = await createToken(newUser.user_id);
                return {
                    accessToken: createdToken.accessToken,
                    refreshToken: createdToken.refreshToken,
                    email: !(newUser.dataValues.email),
                }
            }
            const createdToken = await createToken(user.user_id);
            return {
                accessToken: createdToken.accessToken,
                refreshToken: createdToken.refreshToken,
                email: !(user.dataValues.email),
            }
        } catch (error) {
            return { error };
        }
    },
    githubLoginService: async (code, uri) => {
        try {
            const token = await axios.post('https://github.com/login/oauth/access_token', null, {
                params: {
                    code,
                    client_id: githubOptions.clientID,
                    client_secret: githubOptions.clientSecret,
                    redirect_url: uri,
                }
            });
            const tokenData = new URLSearchParams(token.data);
            const githubUser = await axios.get('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${tokenData.get('access_token')}`
                }
            });
            if (!githubUser) {
                return { error: "" }
            }
            const user = await socialLoginRepository.findBySocialId(githubUser.data.id);
            if (!user) {
                const newUser = await socialLoginRepository.createSocialUser({
                    email: githubUser.data.email || null,
                    code: socialCode.GITHUB,
                    type: "github",
                    name: githubUser.data.name,
                    id: githubUser.data.id,
                    image_url: githubUser.data.avatar_url
                });
                const createdToken = await createToken(newUser.user_id);
                return {
                    accessToken: createdToken.accessToken,
                    refreshToken: createdToken.refreshToken,
                    email: !(newUser.dataValues.email),
                }
            }
            const createdToken = await createToken(user.user_id);
            return {
                accessToken: createdToken.accessToken,
                refreshToken: createdToken.refreshToken,
                email: !(user.dataValues.email),
            }
        } catch (error) {
            return { error };
        }
    },
    googleLoginService: async (code, uri) => {
        try {
            const token = await axios.post('https://oauth2.googleapis.com/token', {}, {
                params: {
                    code,
                    client_id: googleOptions.clientID,
                    client_secret: googleOptions.clientSecret,
                    redirect_uri: uri,
                    grant_type: 'authorization_code'
                }
            });
            const googleUser = await axios.get('https://www.googleapis.com/userinfo/v2/me', {
                headers: {
                    'Authorization': `Bearer ${token.data.access_token}`
                }
            });        
            const user = await socialLoginRepository.findBySocialId(googleUser.data.id); // 여기서 User레포에 요청
            if (!user) {
                const newUser = await socialLoginRepository.createSocialUser({
                    email: googleUser.data.email || null,
                    code: socialCode.GOOGLE,
                    type: "google",
                    name: googleUser.data.name,
                    id: googleUser.data.id,
                    image_url: googleUser.data.picture
                });
                const createdToken = await createToken(newUser.user_id);
                return {
                    accessToken: createdToken.accessToken,
                    refreshToken: createdToken.refreshToken,
                    email: !(newUser.dataValues.email),
                }
            }
            const createdToken = await createToken(user.user_id);
            return {
                accessToken: createdToken.accessToken,
                refreshToken: createdToken.refreshToken,
                email: !(user.dataValues.email),
            }
        } catch (error) {
            return { error };
        }
    }
}