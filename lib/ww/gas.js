// Create a module to hold all GAS endpoints
window.gasModule = {
    whitelistGasUrl: 'https://script.google.com/macros/s/AKfycbyrKyKW8QbnoJCKgeYDgh_uVdZN95SJwtp2maBCZpvjGHsJCLIkUwfwvn06jy-xsTBc/exec',
    blGasUrl: 'https://script.google.com/macros/s/AKfycbxbruQ0vqIb0nuc3988exfp-dmVcIZrz9EIHBRw6OvwgkY7mMOp0Nv5kiampfPVQK8fgQ/exec',
    signinGasUrl: 'https://script.google.com/macros/s/AKfycbzp4wHYqFpTcfDCUZA9ic6f62zTJEUBNbdxEn_6rNHKpwCLZJUCYTgtkTaQNZfEEan8Mw/exec',
    userCheck: 'https://script.google.com/macros/s/AKfycbwspsAn2JlfdL9sMV6dIDyg7jeA3h-faJUWLKfvyHvXaOECeu9QFtWcq7godLfbM6Xk9g/exec',
    gmailCheck: 'https://script.google.com/macros/s/AKfycbx6MmZLeNz4kSv-LjYIkdH8ij2MmYglGuYV2y4Xv3qeMUq2_Qdx_kNyxn4q8t_4HCoeLA/exec', // Replace with the deployed GmailCheck_Secure_GAS.js URL
    verificationGAS: 'https://script.google.com/macros/s/AKfycbwV061ibkFjtp3BUKJHzXzpzXscvGmyl9UtoyzUSCgtvKZHzwxYWIVrdwXhVipXkrJpyw/exec',
    verificationGAS1: 'https://script.google.com/macros/s/AKfycbyTQE2uVviixkwA5HZek9GCvu9jgBJ_01FjgVFXLl-2hHx5Ue8zpPKWoLBlyeLjToboIw/exec',
    registrationGAS: 'https://script.google.com/macros/s/AKfycbzL14rCL_Wcq_f5uBOfIU9v5Pb7qLOGeLjkgqHzGZ243nEk0olpzvAUsq8_JuEq9kitRw/exec',
    addFriReq: 'https://script.google.com/macros/s/AKfycbwCBCqZdUjnkGrfUdLL1FTvkFlr-dSq9PKQvnc9Hbd0uHlkfGNsMAYU4THtYcdo0qfVBA/exec',
    pendingFR: 'https://script.google.com/macros/s/AKfycbztAxpyCF4arbrWR-OJtp6Dgm-P7QHU63U_dSYgHiMvdFp3AwTgRA4ETluIpqDwrNM/exec',
    Acc_DenF: 'https://script.google.com/macros/s/AKfycbzST_SpcEaqflbACrKGo4LxZKhOxxwncWM4iMgRni_Xw4C3mYzpT2MQeDhDbdpwzcp1/exec',
    permissionCheck: 'https://script.google.com/macros/s/AKfycby5QpaENHVZ50H5qsPBQC-MAEWzC15Pc0feI3nuBhofH0BC_-frgfidFBKEY6tteya1Ew/exec',
    bioHandler: 'https://script.google.com/macros/s/AKfycby1RSGwD75Su4ROsy4NjvayYcB-sxQu1x3eO1zSqr9D5kPmeF61i_kvWQJCAPn3wSTm/exec',
    userEmails: 'https://script.google.com/macros/s/AKfycbzrtyvs2dHD2TlR_OPbK2FlX09BPU6lQyLNCtnBQth6M073ef0tqxkDoM3CPnGm2W37/exec', // Secure endpoint with UUID verification
    GlobalAlerts: 'https://script.google.com/macros/s/AKfycbyJ4B1jQmxouS7yzE27Y-xZao3R8_Sk6RxOzjLo1a-zPpAmz45i3byp4pWTLpIjHDxZYg/exec',
    forgotPass: '',
    onlineCheck: '',
    profileHandler: '',
    TFGBOT: '',
};

Object.entries(window.gasModule).forEach(([key, value]) => {
    window[key] = value;
});