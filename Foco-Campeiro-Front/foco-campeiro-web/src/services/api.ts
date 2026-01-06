import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api', // O endereço do seu backend
  withCredentials: true, // Importante para o Cookie de Refresh funcionar!
});