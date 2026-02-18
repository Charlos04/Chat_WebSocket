1) Actualizar tu Python a 3.13.7

2) Descargar los archivos y tenerlos en una carpeta raíz en mi caso está así
     --Chat_WebSocket
     |---static
       |---script.js
       |---styles.css
     |---templates
       |---chat.html
       |---index.html
     |---app.py

   3)Dentro de la carpeta raíz crear un entorno virtual, para que el programa esté en un "ambiente limpio" ejecutaremos las siguientes líneas de código
       python -m venv venv  //Esto es para crear el entorno virtual, y al ejecutarlo se debe crear una carpeta llamada venv
       venv\Scripts\activate  //Esto es para activar el entorno virtual, nos daremos cuenta que ya está activo porque antes de mostrar la ruta de nuestra carpeta hay un "(venv)"

   4) Descargaremos la librería Flask y SocketIO en nuestro entorno, para ello ejecutamos la siguiente línea de comando
        pip install Flask Flask-SocketIO  //Con esto debe empezar la descarga de las liberías
      
     
