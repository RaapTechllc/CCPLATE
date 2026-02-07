import { convexAuth } from "@convex-dev/auth/server";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
});
