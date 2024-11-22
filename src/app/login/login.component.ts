import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  public cpf: string = '';

  constructor(private readonly router: Router) { }

  public login(): void {
    this.router.navigate(['/mapa']);
  }

}
