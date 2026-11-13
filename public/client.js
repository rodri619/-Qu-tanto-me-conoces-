const socket = io();

socket.on('connect', () => {
  console.log('Conectado al servidor');
});

socket.on('salaCreada', (codigo, esAnfitrion) => {
  document.getElementById('codigo-sala').textContent = codigo;
  document.getElementById('pantalla-inicio').hidden = true;
  document.getElementById('pantalla-sala').hidden = false;
  document.getElementById('btn-empezar').hidden = !esAnfitrion;
});

socket.on('unidoASala', (codigo) => {
  document.getElementById('codigo-sala').textContent = codigo;
  document.getElementById('pantalla-inicio').hidden = true;
  document.getElementById('pantalla-sala').hidden = false;
});

socket.on('actualizarJugadores', (jugadores) => {
  const lista = document.getElementById('lista-jugadores');
  lista.innerHTML = '';

  jugadores.forEach((jugador) => {
    const li = document.createElement('li');
    li.textContent = jugador.nombre;
    lista.appendChild(li);
  });

  const tabla = document.getElementById('tabla-puntos');
  tabla.innerHTML = '';
  
  jugadores.forEach((jugador) => {
    const li = document.createElement('li');
    li.textContent = jugador.nombre + ': ' + jugador.puntos + ' puntos';
    tabla.appendChild(li);
  });
});

document.getElementById('btn-crear').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value;
  socket.emit('crearSala', nombre);
});

document.getElementById('btn-unirse').addEventListener('click', () => {
  const nombre = document.getElementById('nombre').value;
  const codigo = document.getElementById('codigo').value.toUpperCase();
  document.getElementById('mensaje-error').textContent = '';
  socket.emit('unirseASala', codigo, nombre);
});

socket.on('error', (mensaje) => {
  document.getElementById('mensaje-error').textContent = mensaje;
  document.getElementById('error-sala').textContent = mensaje;
});

document.getElementById('btn-empezar').addEventListener('click', () => {
  const codigo = document.getElementById('codigo-sala').textContent;
  document.getElementById('error-sala').textContent = '';
  socket.emit('empezar', codigo);
});

socket.on('nuevaRonda', (ronda) => {
  document.getElementById('pantalla-sala').hidden = true;
  document.getElementById('pantalla-ronda').hidden = false;
  document.getElementById('pregunta-ronda').textContent = ronda.pregunta;
  document.getElementById('detalle-ronda').textContent =
    ronda.quienPregunta.nombre + ' le pregunta a ' + ronda.quienResponde.nombre;

    const rol = document.getElementById('rol-ronda');

    if (socket.id === ronda.quienPregunta.id) {
      rol.textContent = 'Te toca preguntar';
    } else if (socket.id === ronda.quienResponde.id) {
      rol.textContent = 'Te toca responder';
    } else {
      rol.textContent = 'Solo mira';
    }
    document.getElementById('botones-validar').hidden = socket.id !== ronda.quienPregunta.id;
    document.getElementById('resultado-ronda').hidden = true;
    document.getElementById('btn-otra-vez').hidden = true;
});

socket.on('rondaTerminada', (fueCorrecta) => {
  document.getElementById('botones-validar').hidden = true;
  document.getElementById('resultado-ronda').hidden = false;
});

document.getElementById('btn-correcta').addEventListener('click', () => {
  const codigo = document.getElementById('codigo-sala').textContent;
  socket.emit('validar', codigo, true);
});

document.getElementById('btn-incorrecta').addEventListener('click', () => {
  const codigo = document.getElementById('codigo-sala').textContent;
  socket.emit('validar', codigo, false);
});

socket.on('juegoTerminado', (nombreGanador, idAnfitrion) => {
  document.getElementById('pregunta-ronda').textContent = '🏆 ¡Ganó ' + nombreGanador + '!';
  document.getElementById('detalle-ronda').textContent = '';
  document.getElementById('rol-ronda').textContent = 'Fin del juego';
  document.getElementById('btn-otra-vez').hidden = socket.id !== idAnfitrion;
});

socket.on('ahoraEresAnfitrion', () => {
  document.getElementById('btn-empezar').hidden = false;
});

document.getElementById('btn-otra-vez').addEventListener('click', () => {
  const codigo = document.getElementById('codigo-sala').textContent;
  socket.emit('jugarOtraVez', codigo);
});

socket.on('volverASala', (idAnfitrion) => {
  document.getElementById('pantalla-ronda').hidden = true;
  document.getElementById('pantalla-sala').hidden = false;
  document.getElementById('btn-empezar').hidden = socket.id !== idAnfitrion;
});