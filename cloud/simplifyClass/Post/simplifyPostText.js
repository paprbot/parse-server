/**
 * Created by shawk on 5/10/2019.
 */

function simplifyPostText (Post) {

    let post = Post.toJSON();
    if (expertOwner.socialProfilePicURL) {delete expertOwner.socialProfilePicURL;}
    if (expertOwner.isTyping === true || expertOwner.isTyping === false) {delete expertOwner.isTyping;}
    if (expertOwner.deviceToken) {delete expertOwner.deviceToken;}
    if (expertOwner.emailVerified === true || expertOwner.emailVerified === false) {delete expertOwner.emailVerified;}
    if (expertOwner.user_location) {delete expertOwner.user_location;}
    if (expertOwner.LinkedInURL || expertOwner.LinkedInURL === null) {delete expertOwner.LinkedInURL;}
    if (expertOwner.authData) {delete expertOwner.authData;}
    if (expertOwner.username) {delete expertOwner.username;}
    if (expertOwner.completedProfileSignup === true || expertOwner.completedProfileSignup ===  false) {delete expertOwner.completedProfileSignup;}
    if (expertOwner.passion) {delete expertOwner.passion;}
    if (expertOwner.identities) {delete expertOwner.identities;}
    if (expertOwner.email) {delete expertOwner.email;}
    if (expertOwner.isDirtyProfileimage === true || expertOwner.isDirtyProfileimage === false) {delete expertOwner.isDirtyProfileimage;}
    if (expertOwner.isDirtyIsOnline === true || expertOwner.isDirtyIsOnline === false) {delete expertOwner.isDirtyIsOnline;}
    if (expertOwner.website) {delete expertOwner.website;}
    if (expertOwner.isNew === true || expertOwner.isNew === false) {delete expertOwner.isNew;}
    if (expertOwner.phoneNumber) {delete expertOwner.phoneNumber;}
    if (expertOwner.createdAt) {delete expertOwner.createdAt;}
    if (expertOwner.updatedAt) {delete expertOwner.updatedAt;}
    if (expertOwner.mySkills) {delete expertOwner.mySkills;}
    if (expertOwner.skillsToLearn) {delete expertOwner.skillsToLearn;}
    if (expertOwner.roles) {delete expertOwner.roles;}
    if (expertOwner.algoliaSecureAPIKey) {delete expertOwner.algoliaSecureAPIKey;}


    return post;
}

module.exports = simplifyPostText;
