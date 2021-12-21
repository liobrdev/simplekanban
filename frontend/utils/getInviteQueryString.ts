export const getInviteQueryString = (query: any): string => {
  const board_slug = typeof query?.board === 'string' && query.board;
  const invite_token = typeof query?.token === 'string' && query.token;
  const invite_email = typeof query?.email === 'string' && query.email;

  if (
    board_slug && invite_token && invite_email &&
    /^[\w-]{10}$/.test(board_slug) &&
    /^[\w-]{64}$/.test(invite_token)
  ) {
    return `?board=${board_slug}&token=${invite_token}&email=${invite_email}`;
  }

  return '';
};