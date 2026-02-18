if (document.getElementById("chatDeMensajes")) {
    //Conectamos con el servidor de socket.io
    const socket = io();

    //Obtenemos los elementos
    const mensajeForm = document.getElementById("mensajesForm");
    const mensajeInput = document.getElementById("mensajeInput");
    const chatDeMensajes = document.getElementById("chatDeMensajes");
    const usuarioPantalla = document.getElementById("usuarioPantalla");
    const salaPantalla = document.getElementById("salaPantalla");
    
    // AGREGADO: Obtenemos el botón de salir para manejar la desconexión manual
    const btnSalir = document.querySelector(".salir");

    // NOTA: Para que las variables de abajo funcionen, extraemos el texto de los elementos que ya obtuviste
    // Se añadió verificación para evitar errores si el elemento no existe
    const usuario = usuarioPantalla ? usuarioPantalla.textContent : "Usuario Desconocido"; 
    const sala = salaPantalla ? salaPantalla.textContent : "Sala Desconocida"; 

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
                'tiempo': tiempo
            });
            mensajeInput.value = ''; //Limpiamos el input
        }
    });

    //Socket reacciona al evento 'connect' enviado por el servidor
    socket.on('connect', function(){ 
        socket.emit('join', {'usuario': usuario, 'sala': sala}); //Al conectarse, se une a la sala
        console.log('Conectado al servidor de Socket.IO');
    });

    socket.on('status', function(data){
        const statusElemento = document.createElement('div'); //Creamos un nuevo DIV por elemento para mostrar el mensaje de estado
        
        // MODIFICADO: Detectamos si es 'info' o 'warning' (manejando el error de tipeo en tu python ' type')
        const tipoClase = data.type || data[' type'] || 'info';
        statusElemento.classList.add('chat-message', tipoClase); 
        
        statusElemento.innerHTML = `<p><em>${data.msg}</em></p>`; 
        chatDeMensajes.appendChild(statusElemento); //Agrega el mensaje de estado al chat
        chatDeMensajes.scrollTop = chatDeMensajes.scrollHeight; //Desplaza el chat hacia abajo para mostrar el nuevo mensaje
    });


    //Cuando el servidor envía un mensaje, lo mostramos en el chat
    socket.on('chat_message', function (data) {
        const mensajeElemento = document.createElement('div'); //Creamos un nuevo DIV por cada mensaje
        mensajeElemento.classList.add('chat-message'); //Agregamos una clase para el estilo

        if (data.usuario === usuario) { //Si el mensaje es del usuario actual, lo mostramos a la derecha
            mensajeElemento.classList.add('my-message'); 
        } else { //Si el mensaje es de otro usuario, lo mostramos a la izquierda
            mensajeElemento.classList.add('other-message'); 
        }

        //Construimos el mensaje en HTML
        mensajeElemento.innerHTML = `
            <span class ='message-nickname'>${data.usuario}:</span>
            <div class ='mensajeTexto'>${data.mensaje}</div>
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