import { Component, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss']
})
export class MapaComponent implements OnInit, OnDestroy {
  private map: L.Map | undefined;
  destino: string = '';
  private userMarker: L.Marker | undefined;
  private locationInterval: any;

  ngOnInit(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          this.map?.setView([userLat, userLng], 15);

          this.userMarker = L.marker([userLat, userLng]).addTo(this.map!)
          .bindPopup('Você está aqui!')
          .openPopup();
        },
        () => {
          alert('Não foi possível obter a sua localização.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocalização não é suportada pelo seu navegador.');
    }
    this.initMap();
    this.locationInterval = setInterval(() => {
      this.updateUserLocation();
    }, 10000);
  }

  ngOnDestroy(): void {
    // Limpa o intervalo ao destruir o componente
    if (this.locationInterval) {
      clearInterval(this.locationInterval);
    }
  }

  private updateUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          if (this.userMarker) {
            this.userMarker.setLatLng([userLat, userLng]);
          } else {
            this.userMarker = L.marker([userLat, userLng]).addTo(this.map!)
              .bindPopup('Você está aqui!')
              .openPopup();
          }

          this.map?.setView([userLat, userLng], this.map.getZoom()); // Mantém o nível de zoom atual
        },
        () => {
          alert('Não foi possível atualizar a sua localização.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      alert('Geolocalização não é suportada pelo seu navegador.');
    }
  }

  private initMap(): void {
    this.map = L.map('map', {preferCanvas: true}).setView([51.505, -0.09], 13, );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  pesquisarDestino(): void {
    if (this.destino.trim() === '') {
      alert('Por favor, digite um destino válido.');
      return;
    }

    // Use a API de geocodificação para buscar as coordenadas
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.destino)}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const destLat = parseFloat(data[0].lat);
          const destLon = parseFloat(data[0].lon);
          this.map?.setView([destLat, destLon], 15);

          // Adiciona um marcador para o destino
          L.marker([destLat, destLon]).addTo(this.map!)
            .bindPopup(`Destino: ${this.destino}`)
            .openPopup();

          // Desenha a rota e captura as ruas intermediárias
          if (this.userMarker) {
            const userLatLng = this.userMarker.getLatLng();
            const routingControl = L.Routing.control({
              waypoints: [
                L.latLng(userLatLng.lat, userLatLng.lng),
                L.latLng(destLat, destLon)
              ],
              routeWhileDragging: true,
              showAlternatives: true,
              createMarker: () => null // Evita criar os marcadores padrões
            } as any).addTo(this.map!);

            routingControl.on('routesfound', (e) => {
              const route = e.routes[0]; // Seleciona a primeira rota encontrada
              const streetNames: string[] = [];
              console.log('Rota:', route);
              // Extrai os nomes das ruas intermediárias
              const ruasString = route.name
              const ruasArray = ruasString.split(',').map((rua: string) => rua.trim());
              // Envia os nomes das ruas para o backend
              console.log(JSON.stringify({ Rua: ruasArray }))
              fetch('http://127.0.0.1:8000/buscar_enderecos/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Rua: ruasArray })
              })
                .then(response => response.json())
                .then(data => {
                  console.log('Resposta do servidor:', data);
                })
                .catch(error => {
                  console.error('Erro ao enviar os nomes das ruas:', error);
                });
            });
          }
        } else {
          alert('Destino não encontrado.');
        }
      })
      .catch(() => {
        alert('Erro ao buscar o destino.');
      });
  }

}
