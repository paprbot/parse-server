/**
 * Created by shawk on 5/24/2019.
 */



function simplifyPostSocial (PostSocial) {

    let postSocial = PostSocial.toJSON();
    if (postSocial.post) {delete postSocial.post;}
    if (postSocial.workspace) {delete postSocial.workspace;}
    if (postSocial.channel) {delete postSocial.channel;}
    if (postSocial.archive) {delete postSocial.archive;}


    return postSocial;
}

module.exports = simplifyPostSocial;

