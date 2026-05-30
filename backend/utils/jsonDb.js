import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'users.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Ensure file exists
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

export const getUsers = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const saveUsers = (users) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
};

export const findUserByEmail = (email) => {
  const users = getUsers();
  return users.find(u => u.email === email);
};

export const addUser = (user) => {
  const users = getUsers();
  users.push({ ...user, _id: Date.now().toString() });
  saveUsers(users);
  return users[users.length - 1];
};
