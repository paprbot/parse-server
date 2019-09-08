/**
 * Created by shawk on 9/7/2019.
 */
/**
 * Created by shawk on 5/24/2019.
 */



function simplifyPostMessageSocialQuestion (PostMessageSocial) {

    let postMessageSocial = PostMessageSocial.toJSON();
    if (postMessageSocial.post) {delete postMessageSocial.post;}
    if (postMessageSocial.user) {delete postMessageSocial.user;}
    if (postMessageSocial.workspace) {delete postMessageSocial.workspace;}
    if (postMessageSocial.channel) {delete postMessageSocial.channel;}
    if (postMessageSocial.archive === false || postMessageSocial.archive === true) {delete postMessageSocial.archive;}
    if (postMessageSocial.postMessage) {delete postMessageSocial.postMessage;}
    if (postMessageSocial.voteValue) {delete postMessageSocial.voteValue;}
    if (postMessageSocial.isNew === false || postMessageSocial.isNew === true) {delete postMessageSocial.isNew;}
    if (postMessageSocial.algoliaIndexID) {delete postMessageSocial.algoliaIndexID;}

    return postMessageSocial;
}

module.exports = simplifyPostMessageSocialQuestion;

