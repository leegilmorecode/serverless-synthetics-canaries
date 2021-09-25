export const randomErrors = (): void | Error => {
  if (Math.random() > 0.9) {
    throw new Error('spurious error');
  }
};
