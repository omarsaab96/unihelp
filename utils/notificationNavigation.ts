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
          helpOfferId: payload.helpOfferId || payload.negotiationOfferId || payload.offerId || null,
          negotiationOfferId: payload.negotiationOfferId || payload.helpOfferId || payload.offerId || null,
          threadTitle: payload.threadTitle,
          threadType: payload.threadType,
        },
      };

    case "helpOfferDetails":
      return {
        pathname: "/helpOfferDetails",
        params: {
          bidTab:true,
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
