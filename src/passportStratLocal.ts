import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { dbClient } from "@db/client";
import { eq } from "drizzle-orm";
import { usersTable } from "@db/schema";

const localStrategy = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
  },
  async function (email, password, done) {
    const query = await dbClient.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });
    if (!query) done(null, false, { message: "No email exists" });
    bcrypt.compare(password, query?.password ?? "", function (err, result) {
      if (err) done(err, false);
      if (result) {
        return done(null, query);
      } else {
        return done(null, false, { message: "Incorrect Password" });
      }
    });
  }
);

export default localStrategy;
