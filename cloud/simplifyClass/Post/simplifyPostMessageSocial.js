/**
 * Created by shawk on 9/7/2019.
 */
/**
 * Created by shawk on 5/24/2019.
 */



function simplifyPostMessageSocialQuestion (PostMessageSocial) {

    let postMessageSocial = PostMessageSocial.toJSON();
    if (postMessageSocial.post) {delete postMessageSocial.post;}
    //if (postMessageSocial.user) {delete postMessageSocial.user;}
    if (postMessageSocial.workspace) {delete postMessageSocial.workspace;}
    if (postMessageSocial.channel) {delete postMessageSocial.channel;}
    if (postMessageSocial.archive === false || postMessageSocial.archive === true) {delete postMessageSocial.archive;}
    if (postMessageSocial.postMessage) {delete postMessageSocial.postMessage;}
    if (postMessageSocial.voteValue === 0 || postMessageSocial.voteValue === -1 || postMessageSocial.voteValue === 1) {delete postMessageSocial.voteValue;}
    if (postMessageSocial.isNew === false || postMessageSocial.isNew === true) {delete postMessageSocial.isNew;}
    if (postMessageSocial.algoliaIndexID) {delete postMessageSocial.algoliaIndexID;}
    if (postMessageSocial.createdAt) {delete postMessageSocial.createdAt;}
    if (postMessageSocial.updatedAt) {delete postMessageSocial.updatedAt;}
    if (postMessageSocial.deliveredDate) {delete postMessageSocial.deliveredDate;}
    if (postMessageSocial.readDate) {delete postMessageSocial.readDate;}
    if (postMessageSocial.postSocial) {delete postMessageSocial.postSocial;}

    return postMessageSocial;
}

module.exports = simplifyPostMessageSocialQuestion;

