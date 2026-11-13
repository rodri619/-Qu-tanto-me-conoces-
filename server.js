const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const salas = {};
const PUNTOS_PARA_GANAR = 30;

const preguntas = [
  '¿Cuál es mi comida favorita?',
  '¿Qué lugar sueño con visitar?',
  '¿Cuál es mi color favorito?',
  '¿Cómo se llama mi mascota?',
  'Si yo fuera una canción, ¿cuál me gustaría ser?',
  '¿Cuál es una cosa que tengo pendiente de hacer antes de morir?',
  'Menciona tres cosas que me hagan feliz',
  'Dime algo que me causa tristeza que una persona pueda llegar a hacer',
  'Dime una película que me gusta mucho',
  'Define mi personalidad',
  'Menciona algo que me moleste',
  '¿Hay algo que coleccionó? si sí, menciónalo',
  '¿Quién es mi mejor amig@?',
  '¿Prefiero la pizza con piña o sin?',
  '¿Soy alérgico a algo? si sí menciónalo',
  '¿Cómo nos conocimos?',
  '¿Quién es mi superhéroe favorito?',
  '¿Tengo cirugías o algo operado?',
  '¿Cuál es mi nombre completo?',
  '¿Qué es lo que más valoro en una amistad?',
  '¿Qué palabra o frase digo con demasiada frecuencia?',
  '¿Quién es mi artista/grupo favorito?',
  'Dime una de mis canciones favoritas',
  '¿Cuál es mi lenguaje de programación favorito?',
  '¿Qué deporte prefiero?',
  '¿Cuál es mi fecha de nacimiento?',
  '¿Qué estación del año es mi favorita?',
  '¿Play Station o Xbox?',
  '¿Frío o Calor?',
  '¿Película favorita?',
  'Dime mi equipo favorito (cualquier deporte)',
  '¿Horchata o Jamaica?',
  '¿Género musical favorito?',
  '¿Me gustaría tener hijos?',
  '¿Cuál es mi día de la semana favorito?',
  '¿Salado o dulce?',
  '¿Cuántos herman@s tengo?',
  '¿En qué escuela cursé el bachillerato?',
  '¿Cuál es mi signo zodiacal?',
];

function preguntaAleatoria(jugador) {
  let disponibles = preguntas.filter((p) => !jugador.preguntasHechas.includes(p));

  if (disponibles.length === 0) {
    jugador.preguntasHechas = [];
    disponibles = preguntas;
  }

  const posicion = Math.floor(Math.random() * disponibles.length);
  return disponibles[posicion];
}

function elegirJugador(jugadores) {
  const posicion = Math.floor(Math.random() * jugadores.length);
  return jugadores[posicion];
}

function elegirDosJugadores(jugadores) {
  const quienPregunta = elegirJugador(jugadores);
  const losQueQuedan = jugadores.filter((j) => j.id !== quienPregunta.id);
  const quienResponde = elegirJugador(losQueQuedan);
  return { quienPregunta: quienPregunta, quienResponde: quienResponde };
}

function iniciarRonda(codigo) {
  const sala = salas[codigo];
  const dos = elegirDosJugadores(sala.jugadores);
  const pregunta = preguntaAleatoria(dos.quienPregunta);
  dos.quienPregunta.preguntasHechas.push(pregunta);

  sala.ronda = {
    quienPregunta: dos.quienPregunta,
    quienResponde: dos.quienResponde
  };

  io.to(codigo).emit('nuevaRonda', {
    pregunta: pregunta,
    quienPregunta: dos.quienPregunta,
    quienResponde: dos.quienResponde
  });
}


function generarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let codigo = '';

  for(let i = 0; i < 4; i++){
    const posicion = Math.floor(Math.random() * letras.length);
    codigo += letras[posicion];
  }

  return codigo;
}


io.on('connection', (socket) => {
  console.log('Alguien se conectó:', socket.id); 

  socket.on('crearSala', (nombre) => {
    const codigo = generarCodigo();
    salas[codigo] = {
      anfitrion: socket.id,
      empezada: false,
      jugadores: [{ id: socket.id, nombre: nombre, puntos: 0, preguntasHechas: [] }]
    };
    socket.join(codigo);
    socket.emit('salaCreada', codigo, true);
    io.to(codigo).emit('actualizarJugadores', salas[codigo].jugadores);
  });

  socket.on('unirseASala', (codigo, nombre) => {
    if(!salas[codigo]){
      socket.emit('error', 'Esa sala no existe');
      return;
    }
    if (salas[codigo].empezada) {
      socket.emit('error', 'La partida ya empezó, sorry');
      return;
    }
    socket.join(codigo);
    salas[codigo].jugadores.push({ id: socket.id, nombre: nombre, puntos: 0, preguntasHechas: []});
    socket.emit('unidoASala', codigo);
    io.to(codigo).emit('actualizarJugadores', salas[codigo].jugadores);
  });

  socket.on('empezar', (codigo) => {
    if (!salas[codigo]) {
      return;
    }
    if (salas[codigo].anfitrion !== socket.id) {
      return;
    }
    if (salas[codigo].jugadores.length < 2) {
      socket.emit('error', 'Se necesitan al menos 2 jugadores');
      return;
    }
    salas[codigo].empezada = true;
    iniciarRonda(codigo);
  });


  socket.on('validar', (codigo, fueCorrecta) => {
    const sala = salas[codigo];
  
    if (!sala) {
      return;
    }
  
    if (!sala.ronda) {
      return;
    }
  
    if (sala.ronda.quienPregunta.id !== socket.id) {
      return;
    }
  
    if (fueCorrecta) {
      const quienResponde = sala.jugadores.find((j) => j.id === sala.ronda.quienResponde.id);
      quienResponde.puntos++;
    }
    sala.ronda = null;
    io.to(codigo).emit('actualizarJugadores', sala.jugadores);
    io.to(codigo).emit('rondaTerminada', fueCorrecta);

    const ganador = sala.jugadores.find((j) => j.puntos >= PUNTOS_PARA_GANAR);
      
    if (ganador) {
      io.to(codigo).emit('juegoTerminado', ganador.nombre, sala.anfitrion);
      return;
    }

    setTimeout(() => {
      if (salas[codigo] && salas[codigo].jugadores.length >= 2) {
        iniciarRonda(codigo);
      }
    }, 5000);
  });


  socket.on('jugarOtraVez', (codigo) => {
    const sala = salas[codigo];
  
    if (!sala) {
      return;
    }
  
    if (sala.anfitrion !== socket.id) {
      return;
    }
  
    sala.empezada = false;
    sala.ronda = null;
    sala.jugadores.forEach((j) => {
      j.puntos = 0;
      j.preguntasHechas = [];
    });
  
    io.to(codigo).emit('volverASala', sala.anfitrion);
    io.to(codigo).emit('actualizarJugadores', sala.jugadores);
  });

  socket.on('disconnect', () => {
    console.log('Alguien se desconectó:', socket.id);
    for (const codigo in salas) {
      salas[codigo].jugadores = salas[codigo].jugadores.filter((jugador) => jugador.id !== socket.id);
      io.to(codigo).emit('actualizarJugadores', salas[codigo].jugadores);
      const sala = salas[codigo];
      if (sala.anfitrion === socket.id && sala.jugadores.length > 0) {
        sala.anfitrion = sala.jugadores[0].id;
        io.to(sala.anfitrion).emit('ahoraEresAnfitrion');
      }
      if (sala.ronda && (sala.ronda.quienPregunta.id === socket.id || sala.ronda.quienResponde.id === socket.id)) {
        sala.ronda = null;
        
        if (sala.jugadores.length >= 2) {
          iniciarRonda(codigo);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});