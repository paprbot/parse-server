/**
 * Created by shawk on 5/24/2019.
 */



function simplifyPostSocial (PostSocial) {

    let postSocial = PostSocial.toJSON();
    if (postSocial.post) {delete postSocial.post;}
    if (postSocial.workspace) {delete postSocial.workspace;}
    if (postSocial.channel) {delete postSocial.channel;}
    if (postSocial.archive) {delete postSocial.archive;}
    if (postSocial.isNew === true || postSocial.isNew === false) {delete postSocial.isNew;}
    if (postSocial.algoliaIndexID) {delete postSocial.algoliaIndexID;}
    if (postSocial.deliveredDate) {delete postSocial.deliveredDate;}
    if (postSocial.readDate) {delete postSocial.readDate;}


    return postSocial;
}

module.exports = simplifyPostSocial;

