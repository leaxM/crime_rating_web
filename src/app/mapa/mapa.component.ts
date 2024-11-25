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
    this.map = L.map('map', { preferCanvas: true }).setView([51.505, -0.09], 13,);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  public pesquisarDestino(): void {
    this.map?.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        this.map?.removeLayer(layer);
      }
    });

    const altElements = document.querySelectorAll('.leaflet-routing-container');
    altElements.forEach((element: Element) => {
      element.innerHTML = '';
    });

    if (this.destino.trim() === '') {
      alert('Por favor, digite um destino válido.');
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.destino)}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const destLat = parseFloat(data[0].lat);
          const destLon = parseFloat(data[0].lon);
          this.map?.setView([destLat, destLon], 15);

          L.marker([destLat, destLon]).addTo(this.map!)
            .bindPopup(`Destino: ${this.destino}`)
            .openPopup();

          if (this.userMarker) {
            const userLatLng = this.userMarker.getLatLng();

            const routingControl = L.Routing.control({
              waypoints: [
                L.latLng(userLatLng.lat, userLatLng.lng),
                L.latLng(destLat, destLon)
              ],
              router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                language: 'pt-BR',
              }),
              routeWhileDragging: true,
              timeTemplate: 'Tempo estimado: {time}',
              show: true,
              showAlternatives: true,
              addWaypoints: false,

            }).addTo(this.map!);

            routingControl.on('routesfound', (e) => {
              const ocorrencias: number[] = [];
              const polylines: L.Polyline[] = [];

              e.routes.forEach((route: any, index: number) => {
                // Cria a polyline para a rota
                const polyline = L.polyline(route.coordinates, {
                  weight: 10, // Largura da linha
                  opacity: 1, // Exibe todas as rotas inicialmente
                  dashArray: undefined, // Remove qualquer estilo de linha pontilhada
                  lineJoin: 'round'
                }).addTo(this.map!);
                polylines.push(polyline);

                const ruasArray = route.instructions.map((instruction: any) => instruction.road);
                fetch('http://127.0.0.1:8000/buscar_enderecos/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ Rua: ruasArray })
                })
                .then(response => response.json())
                .then(data => {
                  const totalOcorrencias = data.reduce((sum: number, item: any) => sum + item.QTD, 0);
                  ocorrencias[index] = totalOcorrencias;

                  const altElements = document.querySelectorAll('.leaflet-routing-alt');
                  if (altElements[index]) {
                    const tagDiv = document.createElement('div');
                    tagDiv.className = 'tag-ocorrencias';
                    tagDiv.textContent = `Ocorrências: ${totalOcorrencias}`;
                    altElements[index].appendChild(tagDiv);

                    (tagDiv as HTMLElement).style.padding = '3px';
                    (tagDiv as HTMLElement).style.width = 'fit-content';
                    (tagDiv as HTMLElement).style.color = 'white';
                    (tagDiv as HTMLElement).style.borderRadius = '15px';

                    // Define a cor de fundo com base no número de ocorrências
                    if (ocorrencias.length === e.routes.length) {
                      const minOcorrencias = Math.min(...ocorrencias);
                      const maxOcorrencias = Math.max(...ocorrencias);
                      ocorrencias.forEach((ocorrencia, i) => {
                        const bgColor = ocorrencia === minOcorrencias ? 'green' : 'red';
                        const lineColor = ocorrencia === minOcorrencias ? 'blue' : 'red';
                        (altElements[i].querySelector('.tag-ocorrencias') as HTMLElement).style.backgroundColor = bgColor;
                        polylines[i].setStyle({ color: lineColor });
                        (altElements[i] as HTMLElement).style.border = `2px solid ${lineColor}`;
                      });
                    }
                  }
                });
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
