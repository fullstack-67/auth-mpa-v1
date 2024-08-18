import {
  Strategy as OAuthStrategy,
  type VerifyCallback,
} from "passport-oauth2";
import axios from "axios";
import { GithubUser, GithubEmails } from "../types/github";
import { github as gh, google as gg } from "../utils/env";
import { type UserData } from "@db/schema";
import { handleUserData } from "@db/repositories";

export const github = new OAuthStrategy(
  {
    authorizationURL: gh.githubAuthorizationURL,
    tokenURL: gh.githubTokenURL,
    clientID: gh.githubClientID,
    clientSecret: gh.githubClientSecret,
    callbackURL: gh.githubCallbackURL,
    scope: "user,user:email",
    passReqToCallback: false,
  },
  // I have to manually annotate this from d.ts file. This should not be the case.
  async function (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ) {
    // console.log({ accessToken, refreshToken, profile, done });

    const resUser = await axios.request<GithubUser>({
      method: "GET",
      url: "https://api.github.com/user",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const uRes = resUser.data;
    //
    const resEmails = await axios.request<GithubEmails>({
      method: "GET",
      url: "https://api.github.com/user/emails",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const emailQuery = resEmails.data.find((em) => em.primary) ?? null;
    if (!emailQuery) done(new Error("Cannot find email"), false);
    //
    const uData: UserData = {
      email: emailQuery?.email ?? "",
      providerAccountId: uRes.node_id ?? "",
      provider: "GITHUB",
      avatarURL: uRes.avatar_url,
      name: uRes.name,
      accessToken: accessToken ?? "",
      refreshToken: refreshToken ?? "",
      userId: "", // Just have to be string
      profile: uRes,
    };
    //
    try {
      const user = await handleUserData(uData);
      done(null, user);
    } catch (err) {
      done(err, false);
    }
  }
);

export const google = new OAuthStrategy(
  {
    authorizationURL: gg.googleAuthorizationURL,
    tokenURL: gg.googleTokenURL,
    clientID: gg.googleClientID,
    clientSecret: gg.googleClientSecret,
    callbackURL: gg.googleCallbackURL,
    scope:
      "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    passReqToCallback: false,
  },
  async function (
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ) {
    console.log({ accessToken, refreshToken, profile, done });
  }
);
