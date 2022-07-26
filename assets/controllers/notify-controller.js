import bootstrap from "bootstrap/dist/js/bootstrap.min";
import {ApplicationController} from 'stimulus-use'
import Subscribe from '../event-source';
import Cookies from "js-cookie";

export default class extends ApplicationController {
    static values = {
        magazineName: String,
        username: String,
        entryId: Number
    };

    connect() {
        this.es(
            this.getTopics()
        );

        window.onbeforeunload = function (event) {
            if (document.es !== undefined) {
                document.es.close();
            }
        };
    }

    es(topics) {
        if (document.es !== undefined) {
            document.es.close();
        }

        let self = this;
        let cb = function (e) {
            let data = JSON.parse(e.data);

            if (data.toast) {
                if(Cookies.get('notifications') === undefined || Cookies.get('notifications') === 'true') {
                    self.toast(data.toast);
                }
            }

            if (data.op.includes('Notification')) {
                self.dispatch('Notification', data);
            }

            if (data.op.includes('Created')) {
                self.notify(data);
            }

            if(Cookies.get('autorefresh') === undefined || Cookies.get('autorefresh') === 'true') {
                self.dispatch(data.op, data);
            }
        }

        document.es = Subscribe(topics, cb);
        // firefox bug: https://github.com/dunglas/mercure/issues/339#issuecomment-650978605
        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            document.es.onerror = (e) => {
                Subscribe(topics, cb);
            };
        }
    }

    getTopics() {
        let topics = [
            'pub',
            'count'
        ];

        if (this.hasMagazineNameValue || this.hasUsernameValue || this.hasPostIdValue) {
            topics = [
                'count',
            ]

            if (this.hasMagazineNameValue) {
                topics.push(`/api/magazines/${this.magazineNameValue}`);
            } else {
                topics.push(`/api/magazines/{id}`);
            }

            if (this.hasUsernameValue) {
                topics.push(`/api/user/${this.usernameValue}`);
            }

            if (this.hasEntryIdValue) {
                topics.push(`/api/entries/${this.entryIdValue}`);
            }
        }

        return topics;
    }

    toast(html) {
        let div = document.createElement('div');
        div.innerHTML = html;
        div = div.firstElementChild;
        let container = document.getElementById('kbin-toast-container')

        container.append(div);
        let t = new bootstrap.Toast(div);

        t.show();

        if (container.children.length >= 2) {
            container.removeChild(container.firstChild);
        }

        t._element.addEventListener('hidden.bs.toast', function (e) {
            e.target.remove();
        })
    }

    notify(content) {
        if ('granted' === Notification.permission) {
            this.createNotification(content);
            return;
        }

        if ('denied' !== Notification.permission) {
            Notification.requestPermission().then((permission) => {
                if ('granted' === permission) {
                    this.createNotification(content);
                }
            });
        }
    }

    createNotification(content) {
        const notification = new Notification(content.title, {
            ...{body: content.body},
            ...(content.icon && {icon: content.icon})
        });

        notification.addEventListener('click', function (event) {
            window.focus();

            if (content.url) {
                window.location = content.url;
            }
        })
    }
}
