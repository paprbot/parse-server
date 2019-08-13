/**
 * Created by shawk on 4/18/2019.
 */

function simplifyUser (User) {

    let userMention = User.toJSON();
    if (userMention.socialProfilePicURL || userMention.socialProfilePicURL === null) {delete userMention.socialProfilePicURL;}
    if (userMention.isTyping === true || userMention.isTyping === false) {delete userMention.isTyping;}
    if (userMention.deviceToken) {delete userMention.deviceToken;}
    if (userMention.emailVerified === true || userMention.emailVerified === false) {delete userMention.emailVerified;}
    if (userMention.user_location) {delete userMention.user_location;}
    if (userMention.LinkedInURL || userMention.LinkedInURL === null ||  userMention.LinkedInURL === "") {delete userMention.LinkedInURL;}
    if (userMention.authData) {delete userMention.authData;}
    if (userMention.username) {delete userMention.username;}
    if (userMention.completedProfileSignup === true || userMention.completedProfileSignup ===  false) {delete userMention.completedProfileSignup;}
    if (userMention.passion) {delete userMention.passion;}
    if (userMention.identities) {delete userMention.identities;}
    if (userMention.email) {delete userMention.email;}
    if (userMention.isDirtyProfileimage === true || userMention.isDirtyProfileimage === false) {delete userMention.isDirtyProfileimage;}
    if (userMention.isChannelUpdated === true || userMention.isChannelUpdated === false) {delete userMention.isChannelUpdated;}
    if (userMention.isUpdateAlgoliaIndex === true || userMention.isUpdateAlgoliaIndex === false) {delete userMention.isUpdateAlgoliaIndex;}
    if (userMention.isWorkspaceUpdated === true || userMention.isWorkspaceUpdated === false) {delete userMention.isWorkspaceUpdated;}
    if (userMention.isDirtyIsOnline === true || userMention.isDirtyIsOnline === false) {delete userMention.isDirtyIsOnline;}
    if (userMention.website || userMention.website === '') {delete userMention.website;}
    if (userMention.isNew === true || userMention.isNew === false) {delete userMention.isNew;}
    if (userMention.phoneNumber || userMention.phoneNumber === '') {delete userMention.phoneNumber;}
    if (userMention.createdAt) {delete userMention.createdAt;}
    if (userMention.updatedAt) {delete userMention.updatedAt;}
    if (userMention.mySkills) {delete userMention.mySkills;}
    if (userMention.skillsToLearn) {delete userMention.skillsToLearn;}
    if (userMention.roles) {delete userMention.roles;}
    if (userMention.algoliaSecureAPIKey) {delete userMention.algoliaSecureAPIKey;}
    if (userMention.currentCompany) {delete userMention.currentCompany;}
    if (userMention.isLogin === true || userMention.isLogin === false) {delete userMention.isLogin;}
    if (userMention.isDirtyShowAvailability === true || userMention.isDirtyShowAvailability === false) {delete userMention.isDirtyShowAvailability;}
    if (userMention.isDirtyTyping === true || userMention.isDirtyTyping === false) {delete userMention.isDirtyTyping;}
    if (userMention.ACL) {delete userMention.ACL}
    if (userMention.isSelectedWorkspaceFollower) {delete userMention.isSelectedWorkspaceFollower}



    return userMention;
}

module.exports = simplifyUser;


