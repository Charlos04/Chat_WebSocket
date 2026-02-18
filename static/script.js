if (document.getElementById("chatDeMensajes")) {
    // Conectamos con el servidor de socket.io
    const socket = io();
    // Inicializamos PeerJS (crea una conexión para video)
    const peer = new Peer(); 

    // --- ELEMENTOS DEL DOM ---
    const mensajeForm = document.getElementById("mensajesForm");
    const mensajeInput = document.getElementById("mensajeInput");
    const chatDeMensajes = document.getElementById("chatDeMensajes");
    
    // Restaurado: Elementos ocultos con datos del usuario
    const usuarioPantalla = document.getElementById("usuarioPantalla");
    const salaPantalla = document.getElementById("salaPantalla");
    
    // Botón de salir
    const btnSalir = document.querySelector(".salir");

    // LÓGICA DEL MENÚ, FOTOS Y EMOJIS
    const btnMas = document.getElementById("btnMas");
    const menuAdjunto = document.getElementById("menuAdjunto");
    const vistaOpciones = document.getElementById("vistaOpciones");
    const vistaEmojis = document.getElementById("vistaEmojis");
    const btnEmojis = document.getElementById("btnEmojis"); 
    const btnFoto = document.getElementById("btnFoto");
    const inputArchivo = document.getElementById("inputArchivo");
    
    // Elementos de Video
    const gridUsuarios = document.getElementById("gridUsuarios"); 
    const btnMic = document.getElementById("btnMic");
    const btnCam = document.getElementById("btnCam");

    // VARIABLES DE USUARIO (Usamos trim() para limpiar espacios)
    const usuario = usuarioPantalla ? usuarioPantalla.textContent.trim() : "Usuario Desconocido"; 
    const sala = salaPantalla ? salaPantalla.textContent.trim() : "Sala Desconocida"; 

    // --- VARIABLES DE MEDIA (VIDEOLLAMADA) ---
    let localStream = null;      // Aquí guardaremos MI video y audio
    let myPeerId = null;         // Aquí guardaremos MI identificador único de PeerJS
    let camaraEncendida = true;  // Estado inicial de la cámara
    let microfonoEncendido = true; // Estado inicial del micrófono
    
    // Diccionario para guardar los videos de los amigos y no perderlos al actualizar el grid
    // Estructura: { "id_del_amigo": ObjetoStream }
    const streamsRemotos = {}; 
    
    // Variable para guardar la lista de usuarios que envía el servidor
    let listaUsuariosGlobal = [];


    // --- 1. FUNCIONES DE PEERJS (CÓDIGO NUEVO PARA LLAMADAS) ---

    // Función que se ejecuta cuando PeerJS nos da un ID (estamos listos para llamar)
    function alAbrirPeer(id) {
        myPeerId = id; // Guardamos nuestro ID
        console.log("Mi ID de video es:", id);
        iniciarMedia(); // Ya tenemos ID, ahora encendemos cámara y nos unimos
    }

    // Función que se ejecuta cuando ALGUIEN NOS LLAMA
    function alRecibirLlamada(call) {
        // Contestamos la llamada enviando nuestro video (localStream)
        call.answer(localStream); 
        
        // Esperamos a recibir el video de la otra persona
        call.on('stream', function(remoteStream) {
            // Guardamos el video del amigo en nuestro diccionario
            streamsRemotos[call.peer] = remoteStream; 
            // Actualizamos la pantalla para mostrarlo
            actualizarGridVideos(); 
        });
    }

    // Asignamos las funciones a los eventos de Peer
    peer.on('open', alAbrirPeer);
    peer.on('call', alRecibirLlamada);


    // --- 2. FUNCIONES DE MEDIA Y GRID ---

    // Función para pedir permisos de cámara y micrófono
    async function iniciarMedia() {
        try {
            // Solicitamos acceso al navegador
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Configuramos estado inicial (Encendido)
            localStream.getVideoTracks()[0].enabled = true;
            localStream.getAudioTracks()[0].enabled = true;

            // Actualizamos visualmente los botones (Blanco = Activo)
            actualizarEstiloBoton(btnCam, true);
            actualizarEstiloBoton(btnMic, true);

            // IMPORTANTE: Ahora que tenemos cámara e ID, nos unimos al Socket
            // Enviamos 'peerId' para que los demás sepan cómo llamarnos
            socket.emit('join', {
                'usuario': usuario, 
                'sala': sala, 
                'peerId': myPeerId 
            });

        } catch (error) {
            console.error("Error cámara:", error);
            alert("No se pudo acceder a la cámara. Revisa los permisos.");
            // Si falla la cámara, nos unimos igual pero sin video
            socket.emit('join', {'usuario': usuario, 'sala': sala, 'peerId': null });
        }
    }

    // Función auxiliar para cambiar color de botones (Rojo/Blanco)
    function actualizarEstiloBoton(btn, activo) {
        if (!btn) return;
        if (activo) {
            btn.classList.remove('bloqueo'); // Quita el rojo
            btn.style.backgroundColor = "white";
            btn.style.color = "#333";
        } else {
            btn.classList.add('bloqueo'); // Pone el rojo
            btn.style.backgroundColor = "";
            btn.style.color = "";
        }
    }

    // Función PRINCIPAL que dibuja los recuadros de video
    function actualizarGridVideos() {
        if (!gridUsuarios) return; // Si no existe el grid, salimos
        gridUsuarios.innerHTML = ''; // Limpiamos el grid para redibujarlo

        // Recorremos la lista de usuarios que nos mandó el servidor
        listaUsuariosGlobal.forEach((u, index) => {
            // Creamos el contenedor (tarjeta)
            const tarjeta = document.createElement('div');
            const colorIndex = index % 4; // Color cíclico
            tarjeta.classList.add('tarjeta-usuario', `color-${colorIndex}`);
            
            // HTML base de la tarjeta
            tarjeta.innerHTML = `
                <div class="iconos-estado"><span>📷</span> <span>🎤</span></div>
                <div class="avatar-grande">👤</div>
                <div class="nombre-usuario">${u.usuario}</div>
            `;

            // Lógica para decidir qué video mostrar en esta tarjeta
            let streamAUsar = null;
            let esMiVideo = false;

            // CASO A: Es mi propia tarjeta
            if (u.peerId === myPeerId) {
                streamAUsar = localStream; // Uso mi cámara
                esMiVideo = true;
            } 
            // CASO B: Es la tarjeta de un amigo y ya tengo su video guardado
            else if (streamsRemotos[u.peerId]) {
                streamAUsar = streamsRemotos[u.peerId]; // Uso el video que me llegó
            }

            // Si tenemos un video para mostrar, creamos la etiqueta <video>
            if (streamAUsar) {
                const videoTag = document.createElement('video');
                videoTag.srcObject = streamAUsar; // Conectamos la señal
                videoTag.autoplay = true; // Que se reproduzca solo
                videoTag.playsInline = true; // Para móviles
                videoTag.classList.add('video-usuario'); // Estilos CSS
                
                // Si es mi video, lo muteo (para no oírme) y lo pongo en espejo
                if (esMiVideo) {
                    videoTag.muted = true;
                    videoTag.style.transform = "scaleX(-1)";
                } else {
                    videoTag.muted = false; // A los amigos sí los escucho
                }

                // Agregamos la clase para ocultar el avatar y pegamos el video
                tarjeta.classList.add('con-video');
                tarjeta.prepend(videoTag);
            }

            // Añadimos la tarjeta al grid
            gridUsuarios.appendChild(tarjeta);
        });
    }

    // --- 3. LISTENERS DE BOTONES (CÁMARA/MICRO) ---

    if (btnCam) {
        btnCam.addEventListener('click', function() {
            if (!localStream) return;
            camaraEncendida = !camaraEncendida; // Alternar estado
            localStream.getVideoTracks()[0].enabled = camaraEncendida; // Apagar/Prender hardware
            actualizarEstiloBoton(btnCam, camaraEncendida); // Cambiar color botón
        });
    }

    if (btnMic) {
        btnMic.addEventListener('click', function() {
            if (!localStream) return;
            microfonoEncendido = !microfonoEncendido; // Alternar estado
            localStream.getAudioTracks()[0].enabled = microfonoEncendido; // Apagar/Prender hardware
            actualizarEstiloBoton(btnMic, microfonoEncendido); // Cambiar color botón
        });
    }


    // --- 4. LÓGICA DE SOCKETS (RECIBIR DATOS) ---

    // Nota: Ya no hacemos socket.emit('join') en 'connect'.
    // Lo hacemos dentro de iniciarMedia() para esperar a tener el PeerID.

    // Cuando el servidor nos manda la lista nueva de usuarios
    socket.on('update_users', function(listaUsuarios) {
        listaUsuariosGlobal = listaUsuarios; // Guardamos la lista
        actualizarGridVideos(); // Dibujamos los cuadros
        
        // REVISAR SI HAY QUE LLAMAR A ALGUIEN
        listaUsuarios.forEach(u => {
            // Si el usuario tiene ID, no soy yo, y NO lo tengo guardado...
            if (u.peerId && u.peerId !== myPeerId && !streamsRemotos[u.peerId]) {
                console.log("Llamando a nuevo usuario:", u.usuario);
                
                // Iniciamos la llamada con PeerJS
                const call = peer.call(u.peerId, localStream);
                
                // Cuando el amigo conteste y mande su video...
                call.on('stream', function(remoteStream) {
                    // Lo guardamos y actualizamos
                    streamsRemotos[u.peerId] = remoteStream;
                    actualizarGridVideos();
                });
            }
        });
    });

    // --- 5. TU LÓGICA ORIGINAL (CHAT, EMOJIS, FOTOS) ---
    // (Mantenida intacta pero organizada en funciones nombradas donde aplica)

    // Lista de emojis (UNICODE)
    const listaEmojis = [
        "\u{1F600}", "\u{1F601}", "\u{1F602}", "\u{1F923}", "\u{1F603}", 
        "\u{1F604}", "\u{1F605}", "\u{1F606}", "\u{1F609}", "\u{1F60A}", 
        "\u{1F60B}", "\u{1F60E}", "\u{1F60D}", "\u{1F618}", "\u{1F970}", 
        "\u{1F610}", "\u{1F611}", "\u{1F636}", "\u{1F644}", "\u{1F60F}", 
        "\u{1F623}", "\u{1F625}", "\u{1F62E}", "\u{1F62F}", "\u{1F62A}", 
        "\u{1F62B}", "\u{1F634}", "\u{1F60C}", "\u{1F61B}", "\u{1F61C}", 
        "\u{1F61D}", "\u{1F924}", "\u{1F612}", "\u{1F613}", "\u{1F614}", 
        "\u{1F615}", "\u{1F643}", "\u{1F911}", "\u{1F632}"
    ];

    // Función para escribir emoji
    function alHacerClicEnEmoji(evento) {
        mensajeInput.value += evento.target.textContent;
        mensajeInput.focus();
    }

    // Generar botones de emojis
    if (vistaEmojis) {
        listaEmojis.forEach(emoji => {
            const span = document.createElement("span");
            span.textContent = emoji;
            span.classList.add("emoji-item");
            span.addEventListener("click", alHacerClicEnEmoji);
            vistaEmojis.appendChild(span);
        });
    }

    // Listeners del Menú
    if(btnMas) btnMas.addEventListener("click", function() {
        menuAdjunto.classList.toggle("oculto");
        vistaOpciones.classList.remove("oculto");
        vistaEmojis.classList.add("oculto");
    });

    if(btnEmojis) btnEmojis.addEventListener("click", function() {
        vistaOpciones.classList.add("oculto");
        vistaEmojis.classList.remove("oculto");
    });

    if(btnFoto) btnFoto.addEventListener("click", function() {
        inputArchivo.click();
        menuAdjunto.classList.add("oculto");
    });

    document.addEventListener("click", function(e) {
        if (btnMas && !btnMas.contains(e.target) && !menuAdjunto.contains(e.target)) {
            menuAdjunto.classList.add("oculto");
        }
    });

    // Envío de Foto
    if(inputArchivo) inputArchivo.addEventListener("change", function(e) {
        const archivo = e.target.files[0];
        if (archivo) {
            const reader = new FileReader();
            reader.onload = function(eventoLectura) {
                const ahora = new Date();
                const tiempo = ahora.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                socket.emit('message', {
                    'usuario': usuario, 'sala': sala,
                    'mensaje': eventoLectura.target.result,
                    'tiempo': tiempo, 'tipo': 'imagen'
                });
            };
            reader.readAsDataURL(archivo);
            e.target.value = '';
        }
    });

    // Envío de Texto
    mensajeForm.addEventListener("submit", function (e) {
        e.preventDefault(); 
        const mensaje = mensajeInput.value.trim(); 
        if (mensaje) { 
            const ahora = new Date();
            const tiempo = ahora.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); 
            socket.emit('message', { 
                'usuario': usuario, 'sala': sala, 'mensaje': mensaje, 'tiempo': tiempo, 'tipo': 'texto' 
            });
            mensajeInput.value = ''; 
            mensajeInput.focus();
        }
    });

    // Recepción de Mensajes
    socket.on('chat_message', function (data) {
        if (data.tipo !== 'imagen' && data.mensaje.startsWith('data:image')) data.tipo = 'imagen';
        
        const mensajeElemento = document.createElement('div');
        mensajeElemento.classList.add('chat-message');
        if (data.usuario === usuario) mensajeElemento.classList.add('my-message'); 
        else mensajeElemento.classList.add('other-message');
        
        let contenidoHTML = (data.tipo === 'imagen') 
            ? `<img src="${data.mensaje}" class="imagen-chat">` 
            : `<div class='mensajeTexto'>${data.mensaje}</div>`;
            
        mensajeElemento.innerHTML = `<span class ='message-nickname'>${data.usuario}:</span>${contenidoHTML}<span class ='message-timestamp'>${data.tiempo}</span>`;
        chatDeMensajes.appendChild(mensajeElemento);
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight;
    });

    // Recepción de Estados (Entró/Salió)
    socket.on('status', function(data){
        const statusElemento = document.createElement('div'); 
        statusElemento.classList.add('chat-message', data.type || 'info'); 
        statusElemento.innerHTML = `<p><em>${data.msg}</em></p>`; 
        chatDeMensajes.appendChild(statusElemento); 
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight;
    });

    // Botón Salir
    if (btnSalir) {
        btnSalir.addEventListener('click', function(e) {
            e.preventDefault();
            // Ya no emitimos 'leave' manual para evitar duplicados. 
            // Solo redirigimos y dejamos que el socket se cierre solo.
            window.location.href = this.href;
        });
    }
}