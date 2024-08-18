import { eq } from "drizzle-orm";
import { dbClient } from "@db/client";
import { accountsTable, UserData, usersTable } from "@db/schema";

interface CheckUserOutput {
  user: typeof usersTable.$inferSelect | null;
  isProviderAccountExist: boolean;
  isUserExist: boolean;
  accountId: string | null;
}

async function getUserFromId(id: string) {
  return dbClient.query.usersTable.findFirst({
    where: eq(usersTable.id, id),
  });
}

async function checkUser(
  email: string,
  provider: "GITHUB" | "DISCORD" | "GOOGLE"
) {
  const output: CheckUserOutput = {
    user: null,
    isProviderAccountExist: false,
    isUserExist: false,
    accountId: null,
  };

  // Check user by email
  const userQuery = await dbClient.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
    with: {
      accounts: true,
    },
  });
  if (userQuery) {
    output.user = userQuery;
    output.isUserExist = true;
    // Check if provider account exists
    const providerQuery = userQuery.accounts.find(
      (acc) => acc.provider === provider
    );
    if (providerQuery) {
      output.isProviderAccountExist = true;
      output.accountId = providerQuery.id;
    }
  }
  return output;
}

export async function handleUserData(uData: UserData) {
  const check = await checkUser(uData.email, "GITHUB");

  if (!check.isUserExist) {
    // Create user
    const queryResult = await dbClient
      .insert(usersTable)
      .values({
        name: uData.name,
        email: uData.email,
        isAdmin: false,
        password: "",
        avatarURL: uData.avatarURL,
      })
      .returning({ id: usersTable.id });

    const userId = queryResult[0].id;
    await dbClient.insert(accountsTable).values({
      userId: userId,
      provider: uData.provider,
      providerAccountId: uData.providerAccountId,
      profile: uData.profile,
      accessToken: uData.accessToken,
      refreshToken: uData.refreshToken,
    });
    return getUserFromId(userId);
  } else {
    if (!check.isProviderAccountExist) {
      // Create provider account
      await dbClient.insert(accountsTable).values({
        userId: check.user?.id ?? "",
        provider: uData.provider,
        providerAccountId: uData.providerAccountId,
        profile: uData.profile,
        accessToken: uData.accessToken,
        refreshToken: uData.refreshToken,
      });
    } else {
      // If provider account exists, update information
      await dbClient
        .update(accountsTable)
        .set({
          profile: uData.profile,
          accessToken: uData.accessToken,
          refreshToken: uData.refreshToken,
        })
        .where(eq(accountsTable.id, check.accountId ?? ""));
    }
    return getUserFromId(check.user?.id ?? "");
  }
}
