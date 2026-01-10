export function buildNotificationRoute(
  screen: string,
  payload: any
): { pathname: string; params: any } {
  switch (screen) {
    case "chat":
      return {
        pathname: "/chat",
        params: {
          userId: payload.userId,
          receiverId: payload.receiverId,
          name: payload.name,
          avatar: payload.avatar,
        },
      };

    case "helpOfferDetails":
      return {
        pathname: "/helpOfferDetails",
        params: {
          data: payload.offerId || payload._id,
        },
      };

    case "clubDetails":
      return {
        pathname: "/clubDetails",
        params: {
          data: payload.clubid || payload._id,
        },
      };

    case "jobDetails":
      return {
        pathname: "/jobDetails",
        params: {
          data: payload.jobId || payload._id || payload.offerId,
        },
      };

    default:
      return {
        pathname: `/${screen}`,
        params: payload,
      };
  }
}
