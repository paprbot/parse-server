/**
 * Created by shawk on 7/10/2019.
 */


function selectUser () {

    let userFieldArray = [];

    userFieldArray.push("user.displayName");
    userFieldArray.push("user.fullname");
    userFieldArray.push("user.profileimage");
    userFieldArray.push("user.showAvailability");
    userFieldArray.push("user.isOnline");

    return userFieldArray;
}

module.exports = selectUser;


