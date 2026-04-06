export const generateUniqueCardNumber = (): string => {
  const timestamp = Date.now().toString(); 
  const last10 = timestamp.slice(-10); 
  const random3 = Math.floor(100 + Math.random() * 900).toString();
  return 'APK-' + last10 + random3;
};
