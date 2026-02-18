from flask import Flask, render_template, request, session, redirect, url_for, flash #importa el html, la solicitud para obtener los datos del formulario, la sesión para guardar los datos del usuario, redireccionar a otra página, url_for para generar URLs y flash para mostrar mensajes de error o éxito
from flask_socketio import SocketIO, emit, join_room, leave_room # SocketIO para la comunicación en tiempo real, emit para enviar mensajes a los clientes, join_room y leave_room para manejar las salas de chat
import os # Para nuestra llave secreta, debido a seguridad
import threading

#Inicializamos la aplicación
app = Flask(__name__) #llama el underscore para crear la aplicación Flask y dónde buscar información
app.config['SECRET_KEY'] ='llave_secreta' #clave secreta para la sesión

# Diccionario global para rastrear usuarios: { session_id: {usuario, sala} }
usuarios_conectados = {}

#Inicializamos SocketIO

socketio = SocketIO(app, cors_allowed_origins="*") #inicializa SocketIO con la aplicación Flask y permite solicitudes de cualquier origen

def tarea_procesar_texto(data):
    """Hilo encargado solo de mensajes de texto"""
    usuario = data['usuario']
    sala = data['sala']
    mensaje = data['mensaje']
    tiempo = data['tiempo']
    
    # Aquí podrías agregar lógica: guardar en BD, filtrar groserías, etc.
    print(f"[HILO TEXTO] Procesando mensaje de {usuario}...")
    
    socketio.emit('chat_message', {
        'usuario': usuario, 
        'mensaje': mensaje, 
        'tiempo': tiempo,
        'tipo': 'texto'
    }, to=sala)

def tarea_procesar_emoji(data):
    """Hilo encargado solo de emojis (si decides separarlos)"""
    usuario = data['usuario']
    sala = data['sala']
    mensaje = data['mensaje'] # El emoji en sí
    tiempo = data['tiempo']
    
    print(f"[HILO EMOJI] {usuario} envió una reacción...")
    
    socketio.emit('chat_message', {
        'usuario': usuario, 
        'mensaje': mensaje, 
        'tiempo': tiempo,
        'tipo': 'texto' # Para el cliente sigue siendo texto visualmente
    }, to=sala)

def tarea_procesar_imagen(data):
    """Hilo encargado de imágenes (LA TAREA PESADA)"""
    usuario = data['usuario']
    sala = data['sala']
    imagen_base64 = data['mensaje']
    tiempo = data['tiempo']
    
    print(f"[HILO IMAGEN] Recibiendo imagen de {usuario} ({len(imagen_base64)} bytes)...")
    
    # AQUÍ ESTABA EL ERROR: Tenías un socketio.emit extra que causaba el duplicado.
    # Lo he quitado. Solo debemos enviar la respuesta AL FINAL.
    
    # Simulamos proceso (opcional)
    # time.sleep(1) 
    
    print(f"[HILO IMAGEN] Imagen procesada y enviada a la sala {sala}")
    
    # Enviamos UNA sola vez, asegurando que el tipo sea 'imagen'
    socketio.emit('chat_message', {
        'usuario': usuario, 
        'mensaje': imagen_base64, 
        'tiempo': tiempo,
        'tipo': 'imagen' # <--- Esto es vital para que el JS sepa que es foto
    }, to=sala)


#Routers
@app.route('/',methods=['GET','POST']) #ruta para la página de inicio, acepta métodos GET y POST
def index():
    if request.method == 'POST': #si el método de la solicitud es POST, significa que el usuario ha enviado el formulario de inicio de sesión
        usuario = request.form.get('usuario') #obtiene el nombre de usuario del formulario
        sala = request.form.get('sala') #obtiene el nombre de la sala del formulario

        if not usuario:
            flash('El nombre de usuario es requerido') #si el nombre de usuario no se proporciona, muestra un mensaje de error
            return render_template('index.html') #vuelve a renderizar la página de inicio
        
        #Guardar el usuario y la sala en la sesión
        session['usuario'] = usuario #guarda el nombre de usuario en la sesión
        session['sala'] = sala #guarda el nombre de la sala en la sesión

        return redirect(url_for('chat')) #redirecciona a la página de chat
    
    #Si el método es GET, simplemente renderiza la página de inicio
    return render_template('index.html') #renderiza la página de inicio

@app.route('/chat') #ruta para la página de chat
def chat():
    if 'usuario' not in session or 'sala' not in session: #si el usuario o la sala no están en la sesión, redirecciona a la página de inicio
        flash('Por favor, ingresa un nombre de usuario y una sala') #muestra un mensaje de error
        return redirect(url_for('index')) #redirecciona a la página de inicio
    
    #sino, entra a la sala de chat
    return render_template('chat.html', usuario=session['usuario'], sala=session['sala']) #renderiza la página de chat y pasa el nombre de usuario y la sala a la plantilla

#socketIO events
@socketio.on('join') #evento para unirse a una sala
def unirse(data):
    usuario = data['usuario'] #obtiene el nombre de usuario del evento
    sala = data['sala'] #obtiene el nombre de la sala del evento

    # Guardamos al usuario en nuestro registro global usando el ID de sesión único
    usuarios_conectados[request.sid] = {'usuario': usuario, 'sala': sala}
    join_room(sala) #une al usuario a la sala

    emit('status', {'msg': f'{usuario} se ha unido a la sala', ' type': 'info'}, to = sala) #envía un mensaje a la sala indicando que el usuario se ha unido
    
    #Enviamos la lista actualizada de usuarios a TODOS en la sala
    # Filtramos solo los usuarios de ESTA sala
    lista_usuarios = [u for u in usuarios_conectados.values() if u['sala'] == sala]
    emit('update_users', lista_usuarios, to=sala)
    
    print(f'{usuario} se ha unido a la sala {sala}') #imprime en la consola que el usuario se ha unido a la sala

@socketio.on('leave') #evento para salir de una sala
def salir(data):
    usuario = data['usuario'] #obtiene el nombre de usuario del evento
    sala = data['sala'] #obtiene el nombre de la sala del evento

    leave_room(sala) #hace que el usuario salga de la sala
    emit('status', {'msg': f'{session["usuario"]} ha salido de la sala', 'type': 'warning'}, to = sala) #envía un mensaje a la sala indicando que el usuario ha salido
    print(f'{usuario} ha salido de la sala {sala}') #imprime en la consola que el usuario ha salido de la sala 

@socketio.on('message')
def manejar_mensajes(data):
    """
    Función principal que recibe TODO, pero delega el trabajo
    a diferentes hilos según el tipo de mensaje.
    """
    tipo = data.get('tipo', 'texto')
    mensaje = data.get('mensaje', '')

    # Verificamos si es un emoji (lógica simple: es corto y parece emoji)
    # OJO: En tu código anterior los emojis se enviaban como 'texto', 
    # aquí trato de detectarlos o puedes enviar tipo='emoji' desde JS.
    es_emoji = False
    if tipo == 'texto' and len(mensaje) < 10 and not mensaje.isalnum():
         # Esta es una detección muy básica, idealmente mándalo como tipo='emoji' desde JS
         es_emoji = True

    if tipo == 'imagen':
        # Creamos y lanzamos el hilo de imagen
        hilo = threading.Thread(target=tarea_procesar_imagen, args=(data,))
        hilo.start()
        
    elif es_emoji:
        # Creamos y lanzamos el hilo de emojis
        hilo = threading.Thread(target=tarea_procesar_emoji, args=(data,))
        hilo.start()
        
    else:
        # Creamos y lanzamos el hilo de texto normal
        hilo = threading.Thread(target=tarea_procesar_texto, args=(data,))
        hilo.start()

@app.errorhandler(404) #maneja el error 404 (página no encontrada)
def page_not_found(e):
    flash('La página que buscas no existe', 'error') #muestra un mensaje de error
    return redirect(url_for('index')) #redirecciona a la página de inicio

@socketio.on('disconnect') #evento que detecta automáticamente cuando se cierra la conexión (cerrar pestaña)
def desconectar():
    #Como no recibimos 'data' del cliente al cerrar la pestaña de golpe, usamos la sesión
    usuario = session.get('usuario') #obtiene el usuario guardado en la sesión
    sala = session.get('sala') #obtiene la sala guardada en la sesión

    # Eliminamos al usuario del registro global
    if request.sid in usuarios_conectados:
        del usuarios_conectados[request.sid]

    if usuario and sala:
        leave_room(sala) #sacamos al usuario de la sala a nivel de socket
        #Usamos tu misma estructura de mensaje de estado
        emit('status', {'msg': f'{usuario} ha salido de la sala', 'type': 'warning'}, to=sala)

        # NUEVO: Actualizamos la lista visual para los que se quedan
        lista_usuarios = [u for u in usuarios_conectados.values() if u['sala'] == sala]
        emit('update_users', lista_usuarios, to=sala)
        
        print(f'{usuario} se ha desconectado de la sala {sala}') #imprime en consola

#Correr la aplicación
if __name__ == '__main__':
    socketio.run(app, debug=True) #ejecuta la aplicación Flask con SocketIO en modo de depuración