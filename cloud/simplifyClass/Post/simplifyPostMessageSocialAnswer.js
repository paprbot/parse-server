/**
 * Created by shawk on 9/7/2019.
 */
/**
 * Created by shawk on 5/24/2019.
 */



function simplifyPostMessageSocialAnswer (PostMessageSocial) {

    let postMessageSocial = PostMessageSocial.toJSON();
    if (postMessageSocial.post) {delete postMessageSocial.post;}
    //if (postMessageSocial.user) {delete postMessageSocial.user;}
    if (postMessageSocial.workspace) {delete postMessageSocial.workspace;}
    if (postMessageSocial.channel) {delete postMessageSocial.channel;}
    if (postMessageSocial.archive === false || postMessageSocial.archive === true) {delete postMessageSocial.archive;}
    if (postMessageSocial.postMessage) {delete postMessageSocial.postMessage;}
    if (postMessageSocial.isLiked === true || postMessageSocial.isLiked === false) {delete postMessageSocial.isLiked;}
    if (postMessageSocial.isBookmarked === true || postMessageSocial.isBookmarked === false) {delete postMessageSocial.isBookmarked;}
    if (postMessageSocial.isNew === false || postMessageSocial.isNew === true) {delete postMessageSocial.isNew;}
    if (postMessageSocial.algoliaIndexID) {delete postMessageSocial.algoliaIndexID;}
    if (postMessageSocial.createdAt) {delete postMessageSocial.createdAt;}
    if (postMessageSocial.updatedAt) {delete postMessageSocial.updatedAt;}

    return postMessageSocial;
}

module.exports = simplifyPostMessageSocialAnswer;


