from flask import Flask, render_template, request, session, redirect, url_for, flash #importa el html, la solicitud para obtener los datos del formulario, la sesión para guardar los datos del usuario, redireccionar a otra página, url_for para generar URLs y flash para mostrar mensajes de error o éxito
from flask_socketio import SocketIO, emit, join_room, leave_room # SocketIO para la comunicación en tiempo real, emit para enviar mensajes a los clientes, join_room y leave_room para manejar las salas de chat
import os # Para nuestra llave secreta, debido a seguridad

#Inicializamos la aplicación
app = Flask(__name__) #llama el underscore para crear la aplicación Flask y dónde buscar información
app.config['SECRET_KEY'] ='llave_secreta' #clave secreta para la sesión

#Inicializamos SocketIO

socketio = SocketIO(app, cors_allowed_origins="*") #inicializa SocketIO con la aplicación Flask y permite solicitudes de cualquier origen

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
    join_room(sala) #une al usuario a la sala

    emit('status', {'msg': f'{usuario} se ha unido a la sala', ' type': 'info'}, to = sala) #envía un mensaje a la sala indicando que el usuario se ha unido
    print(f'{usuario} se ha unido a la sala {sala}') #imprime en la consola que el usuario se ha unido a la sala

@socketio.on('leave') #evento para salir de una sala
def salir(data):
    usuario = data['usuario'] #obtiene el nombre de usuario del evento
    sala = data['sala'] #obtiene el nombre de la sala del evento

    leave_room(sala) #hace que el usuario salga de la sala
    emit('status', {'msg': f'{session["usuario"]} ha salido de la sala', 'type': 'warning'}, to = sala) #envía un mensaje a la sala indicando que el usuario ha salido
    print(f'{usuario} ha salido de la sala {sala}') #imprime en la consola que el usuario ha salido de la sala 

@socketio.on('message') #evento para enviar un mensaje a la sala
def mensajes(data):
    usuario = data['usuario'] #obtiene el nombre del usuairo
    sala = data['sala'] #obtiene el nombre de la sala
    mensaje = data['mensaje'] #obtiene el mensaje del evento
    tiempo = data['tiempo'] #obtiene el tiempo del evento

    print(f'[{tiempo}] {usuario} en {sala}: {mensaje}') #imprime en la consola el mensaje con el formato [tiempo] usuario en sala: mensaje
    emit('chat_message', {'usuario': usuario, 'mensaje': mensaje, 'tiempo': tiempo}, to=sala) #envía el mensaje a la sala con el evento 'chat_message' y los datos del usuario, mensaje y tiempo

@app.errorhandler(404) #maneja el error 404 (página no encontrada)
def page_not_found(e):
    flash('La página que buscas no existe', 'error') #muestra un mensaje de error
    return redirect(url_for('index')) #redirecciona a la página de inicio

@socketio.on('disconnect') #evento que detecta automáticamente cuando se cierra la conexión (cerrar pestaña)
def desconectar():
    #Como no recibimos 'data' del cliente al cerrar la pestaña de golpe, usamos la sesión
    usuario = session.get('usuario') #obtiene el usuario guardado en la sesión
    sala = session.get('sala') #obtiene la sala guardada en la sesión

    if usuario and sala:
        leave_room(sala) #sacamos al usuario de la sala a nivel de socket
        #Usamos tu misma estructura de mensaje de estado
        emit('status', {'msg': f'{usuario} ha salido de la sala', 'type': 'warning'}, to=sala)
        print(f'{usuario} se ha desconectado de la sala {sala}') #imprime en consola

#Correr la aplicación
if __name__ == '__main__':
    socketio.run(app, debug=True) #ejecuta la aplicación Flask con SocketIO en modo de depuración