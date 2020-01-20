/**
 * Created by shawk on 4/18/2019.
 */

function simplifyUser (User) {

    let expertOwner = User.toJSON();
    if (expertOwner.socialProfilePicURL || expertOwner.socialProfilePicURL === null) {delete expertOwner.socialProfilePicURL;}
    if (expertOwner.isTyping === true || expertOwner.isTyping === false) {delete expertOwner.isTyping;}
    if (expertOwner.deviceToken) {delete expertOwner.deviceToken;}
    if (expertOwner.emailVerified === true || expertOwner.emailVerified === false) {delete expertOwner.emailVerified;}
    if (expertOwner.user_location) {delete expertOwner.user_location;}
    if (expertOwner.LinkedInURL || expertOwner.LinkedInURL === null || expertOwner.LinkedInURL === "" ) {delete expertOwner.LinkedInURL;}
    if (expertOwner.authData) {delete expertOwner.authData;}
    if (expertOwner.username) {delete expertOwner.username;}
    if (expertOwner.completedProfileSignup === true || expertOwner.completedProfileSignup ===  false) {delete expertOwner.completedProfileSignup;}
    if (expertOwner.passion || expertOwner.passion === null || expertOwner.passion === "") {delete expertOwner.passion;}
    if (expertOwner.identities) {delete expertOwner.identities;}
    if (expertOwner.email) {delete expertOwner.email;}
    if (expertOwner.isDirtyProfileimage === true || expertOwner.isDirtyProfileimage === false) {delete expertOwner.isDirtyProfileimage;}
    if (expertOwner.isDirtyIsOnline === true || expertOwner.isDirtyIsOnline === false) {delete expertOwner.isDirtyIsOnline;}
    if (expertOwner.website || expertOwner.website === '') {delete expertOwner.website;}
    if (expertOwner.isNew === true || expertOwner.isNew === false) {delete expertOwner.isNew;}
    if (expertOwner.phoneNumber || expertOwner.phoneNumber === '') {delete expertOwner.phoneNumber;}
    if (expertOwner.createdAt) {delete expertOwner.createdAt;}
    if (expertOwner.updatedAt) {delete expertOwner.updatedAt;}
    if (expertOwner.mySkills) {delete expertOwner.mySkills;}
    if (expertOwner.skillsToLearn) {delete expertOwner.skillsToLearn;}
    if (expertOwner.roles) {delete expertOwner.roles;}
    if (expertOwner.algoliaSecureAPIKey) {delete expertOwner.algoliaSecureAPIKey;}
    if (expertOwner.currentCompany) {delete expertOwner.currentCompany;}
    if (expertOwner.title || expertOwner.title === null || expertOwner.title === "") { delete  expertOwner.title;}
    if (expertOwner.isLogin === true || expertOwner.isLogin === false) {delete expertOwner.isLogin;}
    if (expertOwner.isDirtyShowAvailability === true || expertOwner.isDirtyShowAvailability === false) {delete expertOwner.isDirtyShowAvailability;}
    if (expertOwner.isDirtyTyping === true || expertOwner.isDirtyTyping === false) {delete expertOwner.isDirtyTyping;}
    if (expertOwner.ACL) {delete expertOwner.ACL}
    if (expertOwner.isSelectedWorkspaceFollower) {delete expertOwner.isSelectedWorkspaceFollower}
    if (expertOwner.isChannelUpdated === true || expertOwner.isChannelUpdated === false) {delete expertOwner.isChannelUpdated;}
    if (expertOwner.isUpdateAlgoliaIndex === true || expertOwner.isUpdateAlgoliaIndex === false) {delete expertOwner.isUpdateAlgoliaIndex;}
    if (expertOwner.isWorkspaceUpdated === true || expertOwner.isWorkspaceUpdated === false) {delete expertOwner.isWorkspaceUpdated;}
    if (expertOwner.tagFilters) {delete expertOwner.tagFilters}



    return expertOwner;
}

module.exports = simplifyUser;

