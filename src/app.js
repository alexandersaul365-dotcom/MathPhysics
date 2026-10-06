const express = require('express');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const preguntaTeoricaRoutes = require('./routes/preguntaTeoricaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path');

const app = express();

// 12 MB: el admin puede subir hasta 3 imágenes de 2 MB en base64.
app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/contenido', contentRoutes);
app.use('/api/ejercicios', exerciseRoutes);
app.use('/api/preguntas-teoricas', preguntaTeoricaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', progressRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores centralizado
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La petición es demasiado grande' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
