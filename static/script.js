if (document.getElementById("chatDeMensajes")) {
    //Conectamos con el servidor de socket.io
    const socket = io();

    //Obtenemos los elementos
    const mensajeForm = document.getElementById("mensajesForm");
    const mensajeInput = document.getElementById("mensajeInput");
    const chatDeMensajes = document.getElementById("chatDeMensajes");
    
    // --- RESTAURADO: Estos elementos ahora sí existirán en el HTML ---
    const usuarioPantalla = document.getElementById("usuarioPantalla");
    const salaPantalla = document.getElementById("salaPantalla");
    
    // AGREGADO: Obtenemos el botón de salir para manejar la desconexión manual
    const btnSalir = document.querySelector(".salir");

    // LÓGICA DEL MENÚ, FOTOS Y EMOJIS (NUEVOS ELEMENTOS)
    const btnMas = document.getElementById("btnMas");
    const menuAdjunto = document.getElementById("menuAdjunto");
    const vistaOpciones = document.getElementById("vistaOpciones");
    const vistaEmojis = document.getElementById("vistaEmojis");
    const btnEmojis = document.getElementById("btnEmojis"); 
    const btnFoto = document.getElementById("btnFoto");
    const inputArchivo = document.getElementById("inputArchivo");
    const gridUsuarios = document.getElementById("gridUsuarios"); // Referencia al grid de video

    // NOTA: Para que las variables de abajo funcionen, extraemos el texto de los elementos que ya obtuviste
    // IMPORTANTE: Ahora que agregaste los <p id="..."> en el HTML, esto volverá a funcionar
    const usuario = usuarioPantalla ? usuarioPantalla.textContent : "Usuario Desconocido"; 
    const sala = salaPantalla ? salaPantalla.textContent : "Sala Desconocida"; 

    // Lista de emojis usando códigos UNICODE (Más seguro y profesional)
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

    // --- DEFINICIÓN DE FUNCIONES (Para mantener el orden) ---

    // Función A: Qué pasa cuando haces clic en una carita
    function alHacerClicEnEmoji(evento) {
        const emoji = evento.target.textContent;
        mensajeInput.value += emoji; // Agrega el emoji al texto existente
        mensajeInput.focus();        // Devuelve el foco al input para seguir escribiendo
    }

    // Función B: Crea el HTML de cada emoji
    function crearBotonEmoji(emoji) {
        const span = document.createElement("span");
        span.textContent = emoji;
        span.classList.add("emoji-item");
        span.addEventListener("click", alHacerClicEnEmoji); // Asignamos la función A al evento click
        vistaEmojis.appendChild(span);
    }

    // Función C: Alternar visibilidad del menú
    function alternarMenuPrincipal() {
        menuAdjunto.classList.toggle("oculto");
        vistaOpciones.classList.remove("oculto"); // Siempre resetear a la vista de opciones al abrir
        vistaEmojis.classList.add("oculto");
    }

    // Función D: Cambiar a la vista de emojis
    function cambiarAVistaEmojis() {
        vistaOpciones.classList.add("oculto"); // Oculta opciones
        vistaEmojis.classList.remove("oculto"); // Muestra emojis
    }

    // Función E: Abrir el selector de archivos
    function abrirSelectorDeFotos() {
        inputArchivo.click();
        menuAdjunto.classList.add("oculto");
    }

    // Función F: Cerrar menú si clicamos fuera
    function cerrarMenuAlCliquearFuera(e) {
        const clicEnBoton = btnMas.contains(e.target);
        const clicEnMenu = menuAdjunto.contains(e.target);
        if (!clicEnBoton && !clicEnMenu) {
            menuAdjunto.classList.add("oculto");
        }
    }

    // Función G: Procesar la foto seleccionada y enviarla
    function enviarFotoSeleccionada(e) {
        const archivo = e.target.files[0];
        if (archivo) {
            const reader = new FileReader();
            reader.onload = function(eventoLectura) {
                const imagenBase64 = eventoLectura.target.result; 
                const ahora = new Date();
                const tiempo = ahora.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

                //Enviamos la imagen al servidor
                socket.emit('message', {
                    'usuario': usuario,
                    'sala': sala,
                    'mensaje': imagenBase64,
                    'tiempo': tiempo,
                    'tipo': 'imagen' // Importante: especificamos que es imagen
                });
            };
            reader.readAsDataURL(archivo);
            e.target.value = ''; //Limpiamos el input de archivo
        }
    }

    // --- INICIALIZACIÓN DE EVENTOS (Listeners) ---

    // 1. Generar emojis y lógica de menú
    if (vistaEmojis) listaEmojis.forEach(crearBotonEmoji);
    if (btnMas) btnMas.addEventListener("click", alternarMenuPrincipal);
    if (btnEmojis) btnEmojis.addEventListener("click", cambiarAVistaEmojis);
    if (btnFoto) btnFoto.addEventListener("click", abrirSelectorDeFotos);
    document.addEventListener("click", cerrarMenuAlCliquearFuera);

    // 2. Evento para cargar fotos
    if (inputArchivo) {
        inputArchivo.addEventListener("change", enviarFotoSeleccionada);
    }

    // 3. Envío de mensajes de texto (FORMULARIO)
    mensajeForm.addEventListener("submit", function (e) {
        e.preventDefault(); //Evita que el navegador recargue la página al enviar el formulario

        const mensaje = mensajeInput.value.trim(); 
        if (mensaje) { //Solamente se envía si no está vacío
            const ahora = new Date();
            const tiempo = ahora.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); //Obtenemos la hora actual en formato legible

            socket.emit('message', { //Enviamos el mensaje al servidor
                'usuario': usuario,
                'sala': sala,
                'mensaje': mensaje,
                'tiempo': tiempo,
                'tipo': 'texto' // Especificamos que es texto
            });
            mensajeInput.value = ''; //Limpiamos el input
            mensajeInput.focus();
        }
    });

    // --- EVENTOS DE SOCKET.IO (Recepción) ---

    //Socket reacciona al evento 'connect' enviado por el servidor
    socket.on('connect', function(){ 
        socket.emit('join', {'usuario': usuario, 'sala': sala}); //Al conectarse, se une a la sala
        console.log('Conectado al servidor de Socket.IO');
    });

    // NUEVO: Escuchar actualizaciones de la lista de usuarios (Para los recuadros de colores)
    socket.on('update_users', function(listaUsuarios) {
        if (!gridUsuarios) return;

        // 1. Limpiamos el grid actual
        gridUsuarios.innerHTML = '';

        // 2. Recorremos la lista de usuarios conectados
        listaUsuarios.forEach((u, index) => {
            // Creamos el recuadro
            const tarjeta = document.createElement('div');
            
            // Asignamos un color cíclico (0, 1, 2, 3) basado en el índice
            const colorIndex = index % 4; 
            tarjeta.classList.add('tarjeta-usuario', `color-${colorIndex}`);

            // Estructura interna (Iconos arriba, Avatar centro, Nombre abajo)
            tarjeta.innerHTML = `
                <div class="iconos-estado">
                    <span>📷/🚫</span> <span>🎤/🚫</span> </div>
                <div class="avatar-grande">👤</div>
                <div class="nombre-usuario">${u.usuario}</div>
            `;

            gridUsuarios.appendChild(tarjeta);
        });
    });

    //Manejo de estados (Unirse/Salir)
    socket.on('status', function(data){
        const statusElemento = document.createElement('div'); //Creamos un nuevo DIV por elemento para mostrar el mensaje de estado
        
        // Detectamos si es 'info' o 'warning'
        const tipoClase = data.type || data[' type'] || 'info';
        statusElemento.classList.add('chat-message', tipoClase); 
        
        statusElemento.innerHTML = `<p><em>${data.msg}</em></p>`; 
        chatDeMensajes.appendChild(statusElemento); //Agrega el mensaje de estado al chat
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight; //Desplaza el chat hacia abajo para mostrar el nuevo mensaje
    });

    //Cuando el servidor envía un mensaje, lo mostramos en el chat
    socket.on('chat_message', function (data) {
        // Corrección de seguridad: si llega data:image pero el tipo no es imagen, lo corregimos
        if (data.tipo !== 'imagen' && data.mensaje.startsWith('data:image')) {
            data.tipo = 'imagen'; 
        }

        const mensajeElemento = document.createElement('div'); //Creamos un nuevo DIV por cada mensaje
        mensajeElemento.classList.add('chat-message'); //Agregamos una clase para el estilo

        if (data.usuario === usuario) { //Si el mensaje es del usuario actual, lo mostramos a la derecha
            mensajeElemento.classList.add('my-message'); 
        } else { //Si el mensaje es de otro usuario, lo mostramos a la izquierda
            mensajeElemento.classList.add('other-message'); 
        }

        let contenidoHTML = '';

        // DECIDIMOS QUÉ MOSTRAR SEGÚN EL TIPO
        if (data.tipo === 'imagen') {
            // Renderizar IMAGEN
            contenidoHTML = `<img src="${data.mensaje}" class="imagen-chat" alt="Foto enviada">`;
        } else {
            // Renderizar TEXTO (Construimos el mensaje en HTML)
            contenidoHTML = `<div class='mensajeTexto'>${data.mensaje}</div>`;
        }

        mensajeElemento.innerHTML = `
            <span class ='message-nickname'>${data.usuario}:</span>
            ${contenidoHTML}
            <span class ='message-timestamp'>${data.tiempo}</span>
        `;

        chatDeMensajes.appendChild(mensajeElemento); //Agregamos el mensaje al chat
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight; //Desplazamos el chat hacia abajo para mostrar el nuevo mensaje
    });

    // AGREGADO: Manejamos el clic en el botón salir específicamente
    if (btnSalir) {
        btnSalir.addEventListener('click', function(e) {
            e.preventDefault(); // Detenemos la navegación inmediata
            socket.emit('leave', {'usuario': usuario, 'sala': sala}); // Avisamos al servidor
            
            // Damos un pequeño respiro (100ms) para que el mensaje salga antes de cambiar de página
            setTimeout(() => {
                window.location.href = this.href;
            }, 100);
        });
    }

    //Manejamos la desconexión del socket (por si cierran la pestaña)
    window.addEventListener('beforeunload', function() {
        socket.emit('leave', {'usuario': usuario, 'sala': sala}); //Al cerrar la ventana, se notifica al servidor que el usuario se va
    });
}