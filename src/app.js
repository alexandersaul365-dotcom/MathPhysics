const express = require('express');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const preguntaTeoricaRoutes = require('./routes/preguntaTeoricaRoutes');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/contenido', contentRoutes);
app.use('/api/ejercicios', exerciseRoutes);
app.use('/api/preguntas-teoricas', preguntaTeoricaRoutes);
app.use('/api', progressRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores centralizado
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
