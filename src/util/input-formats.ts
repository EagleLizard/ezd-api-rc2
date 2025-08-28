
/*
Input validation
_*/

const password_min_len = 10;

export const inputFormats = {
  checkEmailAddr: checkEmailAddr,
  checkUserName: checkUserName,
  checkPassword: checkPassword,
} as const;

/*
previously: https://stackoverflow.com/a/46181/4677252
However, as the comments point out, this is not sufficient to match the
  standard. According to some replies, the only source of truth for valid
  email addresses is the email providers themselves. I find this definition
  reductive and not useful.
This reply lists some standards: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript/46181#comment3855831_46181
Wikipedia has a list of valid email addresses: https://en.wikipedia.org/wiki/Email_address#Valid_email_addresses
  Conclusion:
    Almost any address is valid. This is frustrating but useful.
      It also simplifies the implementation. It is incumbent upon the user to
      enter their email address, and they may enter a typo anyway. The user
      may also enter a "valid" email address with a domain part that does not
      conform.
    Via RFC5322 section 3.4.1: "It is therefore
      incumbent upon implementations to conform to the syntax of
      addresses for the context in which they are used."
      - I will do lax validation on the local-part
      - I will do rudimentary validation on the domain-part
  Standards & References:
    RFC822 (1982)
    RFC2822 (2001) https://datatracker.ietf.org/doc/html/rfc2822
    RFC5322 (2008) https://datatracker.ietf.org/doc/html/rfc5322
*/
function checkEmailAddr(emailAddr: string): boolean {
  let atSignIdx: number;
  let localPart: string;
  let domainPart: string;
  let localRx: RegExp;
  let domainRx: RegExp;
  atSignIdx = emailAddr.lastIndexOf('@');
  if(atSignIdx === -1) {
    return false;
  }
  localPart = emailAddr.substring(0, atSignIdx);
  localRx = /\S+/i;
  if(!localRx.test(localPart)) {
    return false;
  }
  domainPart = emailAddr.substring(atSignIdx + 1);
  /*
  Don't need to check @ again since we took the substring at the last index
  _*/
  domainRx = /^\S+\.\S+$/;
  if(!domainRx.test(domainPart)) {
    return false;
  }
  return true;
}

/*
perhaps, anything goes
  - any unicode Letter or Number is valid
  - not starting with a number
on second thought, KISS; alphanumeric english It is much easier
  to make it _less_ strict if I want in the future.
  1. alphanumeric english
  2. first char must be a letter
  3. at least 3 chars
  4. max chars?
    i. I don't care actually
    ii. Maybe prevent something absurd
_*/
function checkUserName(userName: string): boolean {
  // let userNameRx = /^\p{L}[\p{L}\p{N}{2,}_]+$/u;
  let userNameRx = /^[a-zA-Z][a-zA-Z0-9_]{2,}$/;
  return userNameRx.test(userName);
}

/*
https://www.nist.gov/cybersecurity/how-do-i-create-good-password
https://pages.nist.gov/800-63-4/sp800-63b.html#appA
password requirements: https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver
  - includes information on storing salt & algorithm
Requirements are WIP. See devlog for more details.
_*/
function checkPassword(password: string): boolean {
  if(password.length < password_min_len) {
    return false;
  }
  /* TODO: additional password checks _*/
  return true;
}
