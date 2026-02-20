import LoginModal from '~/components/modal/Login.vue';

export default () => {
  const modal = useModal();
  const loginAccount = useLoginAccount();

  // 检查是否有登录信息
  function checkLogin() {
    if (loginAccount.value === null) {
      modal.open(LoginModal);
      return false;
    }
    return true;
  }

  return {
    checkLogin,
  };
};
